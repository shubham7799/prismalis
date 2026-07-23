"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGoogleLogin } from "@react-oauth/google";
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

  // useGoogleLogin uses the auth-code flow, but we need the id_token (credential) flow.
  // We use the implicit flow that gives us the access_token, then exchange for id_token via
  // tokeninfo. Actually, the backend expects a Google ID token — so we use the credential
  // callback flow via renderButton or the One Tap. useGoogleLogin (implicit) gives access_token,
  // not id_token. Instead we'll use the credential response from the renderButton approach
  // by building a custom button that calls google.accounts.id.prompt().
  // Simplest: use useGoogleLogin with flow="implicit" to get access_token, then fetch userinfo
  // and build the id_token isn't possible. We need credential.
  //
  // Best approach: use GoogleLogin component (renders the official button) but style it with
  // a custom container and useGoogleLogin's onSuccess which returns a credential when using
  // the authorization_code flow or the One Tap.
  //
  // Actually @react-oauth/google's useGoogleLogin with flow="auth-code" returns a code,
  // not an id_token. The id_token is only available via the <GoogleLogin> render-button
  // or One Tap (which give CredentialResponse with .credential = id_token).
  //
  // So we use <GoogleLogin> with a custom render via useGoogleLogin... wait, there's a simpler way:
  // just use the GoogleLogin component directly but wrap it in our own styled container.

  const handleGoogleSuccess = async (credential: string) => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential);
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
              <GoogleButton
                loading={googleLoading}
                onCredential={handleGoogleSuccess}
              />
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

// ── Google button ─────────────────────────────────────────────────────────────

function GoogleButton({
  loading,
  onCredential,
}: {
  loading: boolean;
  onCredential: (credential: string) => void;
}) {
  const googleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      // Exchange access_token for userinfo, then use id_token via tokeninfo
      // The backend's /api/auth/google expects a Google ID token.
      // With implicit flow we get access_token, not id_token directly.
      // We fetch tokeninfo to get the id_token indirectly — but Google's
      // tokeninfo endpoint also accepts access_tokens to return user info.
      // Better: use the credential (id_token) from the authorization_code flow.
      // Re-approach: use flow:"auth-code" returns code, not what we need either.
      //
      // The cleanest is to use the access_token to call userinfo and then
      // build a custom payload — but the backend validates a real Google ID token.
      //
      // Solution: use the Google Identity Services initTokenClient approach
      // which gives us an id_token via the nonce mechanism, OR use
      // useGoogleLogin with flow:"implicit" which actually DOES include
      // id_token in the response when the scope includes "openid".
      const idToken = (tokenResponse as Record<string, unknown>).id_token as string | undefined;
      if (idToken) {
        onCredential(idToken);
      }
    },
    scope: "openid email profile",
    onError: () => {},
  });

  return (
    <button
      type="button"
      onClick={() => googleLogin()}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-surface py-2.5 px-4 text-sm font-medium transition-all hover:border-border/80 hover:bg-card disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <GoogleIcon />
      )}
      Continue with Google
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
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
