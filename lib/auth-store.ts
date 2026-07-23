"use client";

import { createContext, useContext, useEffect, useState, ReactNode, createElement } from "react";
import { api, clearToken, getToken, setToken, User } from "./api";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.auth.me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.auth.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
  }

  async function register(email: string, password: string, name?: string) {
    const res = await api.auth.register(email, password, name);
    setToken(res.access_token);
    setUser(res.user);
  }

  async function loginWithGoogle(idToken: string) {
    const res = await api.auth.googleLogin(idToken);
    setToken(res.access_token);
    setUser(res.user);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return createElement(Ctx.Provider, { value: { user, loading, login, register, loginWithGoogle, logout } }, children);
}

export function useAuth() {
  return useContext(Ctx);
}
