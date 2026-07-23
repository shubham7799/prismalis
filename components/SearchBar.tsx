"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { api } from "@/lib/api";

type Result = { symbol: string; name: string; exchange: string };

export function SearchBar({ autoFocus = false, size = "md" }: { autoFocus?: boolean; size?: "sm" | "md" }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (sym: string) => {
    setOpen(false);
    setQ("");
    router.push(`/stock/${sym.toUpperCase()}`);
  };

  const handleChange = (value: string) => {
    setQ(value);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.stocks.search(value, 8);
        const mapped: Result[] = res.map((r) => ({
          symbol: r.symbol,
          name: r.name,
          exchange: r.exchangeShortName ?? r.exchange ?? "",
        }));
        setResults(mapped);
        setOpen(mapped.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
  };

  const isLg = size === "md";

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className={`flex items-center gap-3 rounded-2xl border transition-all duration-200 bg-card/60 backdrop-blur ${
          focused
            ? "border-neon-purple/60 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
            : "border-border hover:border-border/80"
        } ${isLg ? "px-5 py-4" : "px-4 py-2.5"}`}
      >
        {loading ? (
          <Loader2 className={`${isLg ? "size-5" : "size-4"} animate-spin text-neon-purple`} />
        ) : (
          <Search className={`${isLg ? "size-5" : "size-4"} text-muted-foreground`} />
        )}
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { setFocused(true); if (results.length > 0) setOpen(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) go(results[0]?.symbol ?? q.trim());
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={isLg ? "Search any US stock — try AAPL, NVDA, TSLA…" : "Search stocks…"}
          className={`flex-1 bg-transparent outline-none placeholder:text-muted-foreground/60 ${isLg ? "text-lg" : "text-sm"}`}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/40">
          {results.map((r, i) => (
            <button
              key={r.symbol}
              onMouseDown={(e) => { e.preventDefault(); go(r.symbol); }}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface border-b border-border/40 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-xs font-bold text-neon-purple border border-border">
                  {r.symbol.slice(0, 2)}
                </span>
                <div>
                  <div className="font-semibold text-sm">{r.symbol}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[260px]">{r.name}</div>
                </div>
              </div>
              <span className="ml-4 shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {r.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
