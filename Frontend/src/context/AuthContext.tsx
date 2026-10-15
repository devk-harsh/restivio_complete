import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { acceptSession, listenForSession, refreshSession } from "../api/client";
import { authApi } from "../api/auth.api";
import type { User } from "../types/api";
type Auth = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const unsubscribe = listenForSession((session) => {
      if (active) setUser(session?.user || null);
    });
    void refreshSession()
      .then(() => authApi.me())
      .then((current) => {
        if (active) setUser(current);
      })
      .catch(() => {
        if (active) acceptSession(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return (
    <Context.Provider
      value={{ user, loading, login: authApi.login, logout: authApi.logout }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
