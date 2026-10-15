import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  acceptSession,
  authClient,
  bookingClient,
  hotelClient,
  listenForSession,
  refreshSession,
} from "./client";
const user = {
  id: 1,
  name: "Test",
  email: "test@example.com",
  role: "USER" as const,
};
const session = (accessToken: string) => ({
  accessToken,
  user,
  expiresIn: 900,
});
const response = (
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
) => ({ config, data, status, statusText: "OK", headers: new AxiosHeaders() });
function unauthorized(config: InternalAxiosRequestConfig): never {
  throw new AxiosError(
    "Unauthorized",
    "ERR_BAD_REQUEST",
    config,
    undefined,
    response(config, {}, 401),
  );
}
beforeEach(() => {
  acceptSession(null);
  listenForSession(() => {});
});
describe("in-memory session and one-time retry", () => {
  it("coalesces concurrent refresh calls into one cookie request", async () => {
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => {
      expect(config.withCredentials).toBe(true);
      return response(config, { data: session("new") });
    });
    authClient.defaults.adapter = refresh;
    const [a, b] = await Promise.all([refreshSession(), refreshSession()]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(a.accessToken).toBe("new");
    expect(b).toBe(a);
  });
  it("retries concurrent 401s with a single refresh and preserves the booking key and body", async () => {
    acceptSession(session("expired"));
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) =>
      response(config, { data: session("fresh") }),
    );
    authClient.defaults.adapter = refresh;
    const seen: Array<{ token: unknown; key: unknown; body: unknown }> = [];
    bookingClient.defaults.adapter = async (config) => {
      seen.push({
        token: config.headers.get("Authorization"),
        key: config.headers.get("Idempotency-Key"),
        body: config.data,
      });
      if (config.headers.get("Authorization") === "Bearer expired")
        unauthorized(config);
      return response(config, { success: true });
    };
    hotelClient.defaults.adapter = async (config) => {
      if (config.headers.get("Authorization") === "Bearer expired")
        unauthorized(config);
      return response(config, {});
    };
    await Promise.all([
      bookingClient.post(
        "/bookings",
        { hotelId: 1 },
        { headers: { "Idempotency-Key": "same-attempt" } },
      ),
      hotelClient.get("/hotels"),
    ]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toEqual({
      token: "Bearer fresh",
      key: "same-attempt",
      body: seen[0].body,
    });
  });
  it("clears the session after failed refresh without looping", async () => {
    acceptSession(session("expired"));
    const changed = vi.fn();
    listenForSession(changed);
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) =>
      unauthorized(config),
    );
    authClient.defaults.adapter = refresh;
    hotelClient.defaults.adapter = async (config) => unauthorized(config);
    await expect(hotelClient.get("/hotels")).rejects.toBeInstanceOf(AxiosError);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith(null);
  });
  it("does not refresh again when the retried request also returns 401", async () => {
    acceptSession(session("expired"));
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) =>
      response(config, { data: session("fresh") }),
    );
    authClient.defaults.adapter = refresh;
    const request = vi.fn(async (config: InternalAxiosRequestConfig) =>
      unauthorized(config),
    );
    hotelClient.defaults.adapter = request;
    await expect(hotelClient.get("/hotels")).rejects.toBeInstanceOf(AxiosError);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("does not treat invalid login as an expired protected request", async () => {
    const request = vi.fn(async (config: InternalAxiosRequestConfig) =>
      unauthorized(config),
    );
    authClient.defaults.adapter = request;
    await expect(authClient.post("/auth/login", {})).rejects.toBeInstanceOf(
      AxiosError,
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("does not resurrect authentication after logout while refresh was pending", async () => {
    acceptSession(session("old"));
    const changed = vi.fn();
    listenForSession(changed);
    let complete: (() => void) | undefined;
    authClient.defaults.adapter = async (config) => {
      await new Promise<void>((resolve) => {
        complete = resolve;
      });
      return response(config, { data: session("fresh") });
    };
    const pending = refreshSession();
    await vi.waitFor(() => expect(complete).toBeDefined());
    acceptSession(null);
    complete!();
    await expect(pending).rejects.toThrow("Session changed");
    expect(changed).toHaveBeenLastCalledWith(null);
  });
});
