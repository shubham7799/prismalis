"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Bookmark, LogOut, Sparkles, SlidersHorizontal, User } from "lucide-react";
import { useAuth } from "@/lib/auth-store";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 shadow-lg shadow-violet-900/30 group-hover:shadow-violet-700/40 transition-shadow">
            <Activity className="size-4 text-white" />
          </div>
          <span className="text-base font-extrabold tracking-tight">
            <span className="gradient-text">Prismalis</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium">
          <NavLink href="/screener" icon={<SlidersHorizontal className="size-4" />} label="Screener" />
          <NavLink href="/assistant" icon={<Sparkles className="size-4" />} label="AI" />
          <NavLink href="/watchlist" icon={<Bookmark className="size-4" />} label="Watchlist" />

          {user ? (
            <div className="ml-1 flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
              <User className="size-3.5 text-neon-purple" />
              <span className="text-muted-foreground max-w-[120px] truncate">
                {user.full_name ?? user.email}
              </span>
              <button
                onClick={handleLogout}
                className="ml-1 text-muted-foreground hover:text-neon-red transition-colors"
                title="Sign out"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          ) : (
            <Link href="/auth" className="btn-neon ml-1">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
