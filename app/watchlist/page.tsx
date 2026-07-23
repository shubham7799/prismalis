"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, Bookmark, Loader2, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/lib/auth-store";
import { api, WatchlistItem } from "@/lib/api";
import { fmtCurrency, fmtNum, fmtPct } from "@/lib/format";

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    api.watchlist.list()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  async function remove(symbol: string) {
    setRemoving(symbol);
    try {
      await api.watchlist.remove(symbol);
      setItems((prev) => prev.filter((i) => i.symbol !== symbol));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <div className="border-b border-border/40 bg-background/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <SearchBar size="sm" />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Bookmark className="size-5 text-neon-amber" />
          <h1 className="text-xl font-bold">Watchlist</h1>
          {!loading && items.length > 0 && (
            <span className="rounded-full bg-neon-amber/10 border border-neon-amber/20 px-2.5 py-0.5 text-xs font-semibold text-neon-amber">
              {items.length}
            </span>
          )}
        </div>

        {/* Not logged in */}
        {!authLoading && !user && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="size-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-2xl">🔒</div>
            <h2 className="text-lg font-bold">Sign in to see your watchlist</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Create an account to save stocks and track them here.
            </p>
            <Link href="/auth" className="btn-neon mt-2">Sign in</Link>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-neon-purple" />
          </div>
        )}

        {/* Empty */}
        {!loading && user && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="size-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-2xl">📋</div>
            <h2 className="text-lg font-bold">Your watchlist is empty</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Search for a stock and click the Watchlist button to add it here.
            </p>
            <Link href="/" className="btn-neon mt-2">Search stocks</Link>
          </div>
        )}

        {/* List */}
        {!loading && items.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const up = (item.change ?? 0) >= 0;
              return (
                <div key={item.symbol} className="glass-card-hover p-5 relative group">
                  {/* Remove button */}
                  <button
                    onClick={() => remove(item.symbol)}
                    disabled={removing === item.symbol}
                    className="absolute top-3 right-3 rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-neon-red hover:bg-neon-red/10 transition-all"
                  >
                    {removing === item.symbol
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Trash2 className="size-3.5" />}
                  </button>

                  <Link href={`/stock/${item.symbol}`} className="block">
                    <div className="flex items-start gap-3 mb-4">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.symbol}
                          width={36}
                          height={36}
                          className="size-9 rounded-lg object-contain bg-white/5 border border-border p-0.5 shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="size-9 rounded-lg bg-surface border border-border flex items-center justify-center text-xs font-bold text-neon-purple shrink-0">
                          {item.symbol.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-sm">{item.symbol}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.companyName}</div>
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xl font-extrabold tabular-nums">
                          {fmtCurrency(item.price)}
                        </div>
                        <div className={`flex items-center gap-0.5 text-xs font-semibold mt-0.5 ${up ? "badge-up" : "badge-down"}`}>
                          {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                          {fmtCurrency(Math.abs(item.change))} ({fmtPct(item.changePercentage)})
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{fmtNum(item.marketCap, { compact: true })} cap</div>
                        <div className={`text-[10px] rounded-full px-1.5 py-0.5 mt-1 inline-block ${
                          up ? "bg-neon-green/10 text-neon-green" : "bg-neon-red/10 text-neon-red"
                        }`}>
                          {item.exchangeFullName ?? item.exchange}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
