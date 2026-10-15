import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import type { Envelope, Session } from "../types/api";
const base = (url: string) => url.replace(/\/$/, "") + "/api/v1";
export const authClient = axios.create({
  baseURL: base(
    import.meta.env.VITE_AUTH_SERVICE_URL || "http://localhost:3000",
  ),
  withCredentials: true,
  timeout: 12000,
});
export const hotelClient = axios.create({
  baseURL: base(
    import.meta.env.VITE_HOTEL_SERVICE_URL || "http://localhost:3001",
  ),
  timeout: 12000,
});
export const bookingClient = axios.create({
  baseURL: base(
    import.meta.env.VITE_BOOKING_SERVICE_URL || "http://localhost:3002",
  ),
  timeout: 30000,
});
let accessToken: string | null = null;
let generation = 0;
let listener: (session: Session | null) => void = () => {};
let refreshing: Promise<Session> | null = null;
export function listenForSession(callback: typeof listener) {
  listener = callback;
  return () => {
    listener = () => {};
  };
}
export function acceptSession(session: Session | null) {
  generation++;
  accessToken = session?.accessToken || null;
  listener(session);
}
export function refreshSession(): Promise<Session> {
  if (!refreshing) {
    const started = generation;
    refreshing = authClient
      .post<Envelope<Session>>("/auth/refresh")
      .then(({ data }) => {
        if (generation !== started)
          throw new Error("Session changed during refresh");
        accessToken = data.data.accessToken;
        listener(data.data);
        return data.data;
      })
      .catch((error) => {
        if (generation === started) acceptSession(null);
        throw error;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}
type RetryRequest = InternalAxiosRequestConfig & { _retried?: boolean };
for (const client of [authClient, hotelClient, bookingClient]) {
  client.interceptors.request.use((config) => {
    // Login/refresh/logout use cookies; never attach a stale access token to them.
    if (
      accessToken &&
      !config.url?.match(/\/auth\/(login|register|refresh|logout)$/)
    )
      config.headers.set("Authorization", "Bearer " + accessToken);
    return config;
  });
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config as RetryRequest | undefined;
      if (
        !config ||
        error.response?.status !== 401 ||
        config._retried ||
        config.url?.match(/\/auth\/(login|register|refresh|logout)$/)
      )
        return Promise.reject(error);
      config._retried = true;
      try {
        // Another request may already have refreshed while this old request was in flight.
        const sent = config.headers.get("Authorization");
        if (!accessToken || sent === "Bearer " + accessToken)
          await refreshSession();
        config.headers = AxiosHeaders.from(config.headers);
        config.headers.set("Authorization", "Bearer " + accessToken);
        return await client.request(config);
      } catch (retryError) {
        if (
          axios.isAxiosError(retryError) &&
          retryError.response?.status === 401
        )
          acceptSession(null);
        return Promise.reject(retryError);
      }
    },
  );
}
