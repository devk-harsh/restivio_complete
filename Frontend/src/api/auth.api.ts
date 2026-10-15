import { authClient, acceptSession } from "./client";
import type { Envelope, Session, User } from "../types/api";
export const authApi = {
  async register(input: { name: string; email: string; password: string }) {
    return (await authClient.post<Envelope<User>>("/auth/register", input)).data
      .data;
  },
  async login(email: string, password: string) {
    const session = (
      await authClient.post<Envelope<Session>>("/auth/login", {
        email,
        password,
      })
    ).data.data;
    acceptSession(session);
    return session.user;
  },
  async me() {
    return (await authClient.get<Envelope<User>>("/auth/me")).data.data;
  },
  async logout() {
    // Keep the session visible if revocation fails, so logout can be retried honestly.
    await authClient.post("/auth/logout");
    acceptSession(null);
  },
};
