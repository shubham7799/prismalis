"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Activity, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

const HAS_GOOGLE = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, register, loginWithGoogle } = useAuth();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name || undefined);
      }
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSuccess = async (res: CredentialResponse) => {
    if (!res.credential) {
      setError("Google sign-in did not return a credential.");
      return;
    }
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle(res.credential);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-purple/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 shadow-lg shadow-violet-900/40">
              <Activity className="size-5 text-white" />
            </div>
            <span className="text-lg font-extrabold gradient-text">Prismalis</span>
          </Link>
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in to access your watchlist and research."
              : "Start screening US stocks for free."}
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          {/* Mode tabs */}
          <div className="mb-6 flex rounded-xl bg-surface p-1 gap-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          {/* Google button */}
          {HAS_GOOGLE && (
            <>
              <div className="relative flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google sign-in failed")}
                  theme="filled_black"
                  shape="pill"
                  width="336"
                />
                {googleLoading && (
                  <div className="absolute inset-0 grid place-items-center rounded-full bg-background/70 backdrop-blur-sm">
                    <Loader2 className="size-4 animate-spin text-neon-purple" />
                  </div>
                )}
              </div>
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-xs text-muted-foreground">or continue with email</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <Field label="Full name (optional)">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="form-input"
                />
              </Field>
            )}

            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
                autoComplete="email"
              />
            </Field>

            <Field label="Password">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pr-10"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="rounded-lg bg-neon-red/10 border border-neon-red/20 px-4 py-2.5 text-sm text-neon-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-neon w-full py-2.5 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="text-neon-purple hover:underline font-medium"
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>

      <style>{`
        .form-input {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.9375rem;
          color: var(--foreground);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .form-input::placeholder { color: var(--muted-foreground); opacity: 0.6; }
        .form-input:focus {
          border-color: rgba(168, 85, 247, 0.6);
          box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.08);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
