"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter, Loader2, RotateCcw, SlidersHorizontal, TrendingUp } from "lucide-react";

import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-store";
import { api, ScreenerFilters, ScreenerResult } from "@/lib/api";
import { fmtCurrency, fmtNum, fmtPct } from "@/lib/format";

const SECTORS = [
  "Technology", "Healthcare", "Financial Services", "Consumer Cyclical",
  "Consumer Defensive", "Energy", "Industrials", "Basic Materials",
  "Real Estate", "Utilities", "Communication Services",
];
const EXCHANGES = ["NASDAQ", "NYSE", "AMEX"];

// Raw string form state; converted to typed filters on submit.
type FormState = {
  sector: string;
  industry: string;
  exchange: string;
  country: string;
  marketCapMin: string;
  marketCapMax: string;
  peMin: string;
  peMax: string;
  priceMin: string;
  priceMax: string;
  betaMax: string;
  dividendMin: string;
  revenueGrowthMin: string; // entered as a percentage, e.g. 15
  limit: string;
};

const EMPTY: FormState = {
  sector: "", industry: "", exchange: "", country: "",
  marketCapMin: "", marketCapMax: "", peMin: "", peMax: "",
  priceMin: "", priceMax: "", betaMax: "", dividendMin: "",
  revenueGrowthMin: "", limit: "25",
};

const num = (s: string): number | undefined => {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return isNaN(n) ? undefined : n;
};

export default function ScreenerPage() {
  const { user, loading: authLoading } = useAuth();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [results, setResults] = useState<ScreenerResult[] | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setLoading(true);

    const filters: ScreenerFilters = {
      sector: form.sector || undefined,
      industry: form.industry.trim() || undefined,
      exchange: form.exchange || undefined,
      country: form.country.trim() || undefined,
      marketCapMin: num(form.marketCapMin),
      marketCapMax: num(form.marketCapMax),
      peMin: num(form.peMin),
      peMax: num(form.peMax),
      priceMin: num(form.priceMin),
      priceMax: num(form.priceMax),
      betaMax: num(form.betaMax),
      dividendMin: num(form.dividendMin),
      // backend expects a decimal (0.15 = 15%); the field takes a percentage
      revenueGrowthMin: num(form.revenueGrowthMin) != null ? num(form.revenueGrowthMin)! / 100 : undefined,
      limit: num(form.limit) ?? 25,
    };

    try {
      const res = await api.screener.screen(filters);
      setResults(res.results);
      setCount(res.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Screener failed");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(EMPTY);
    setResults(null);
    setError("");
  }

  // ── Not authed ─────────────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center px-4">
          <div className="size-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
            <SlidersHorizontal className="size-7 text-neon-purple" />
          </div>
          <h2 className="text-xl font-bold">Sign in to use the screener</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Filter the entire US market by sector, valuation, price, volatility,
            dividends, and growth.
          </p>
          <Link href="/auth" className="btn-neon mt-2">Sign in / Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <SlidersHorizontal className="size-5 text-neon-purple" />
          <h1 className="text-xl font-bold">Stock Screener</h1>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* ── Filters ──────────────────────────────────────────── */}
          <form onSubmit={run} className="glass-card p-5 h-fit space-y-4 lg:sticky lg:top-6">
            <Select label="Sector" value={form.sector} onChange={(v) => set("sector", v)} options={SECTORS} placeholder="Any sector" />
            <Text label="Industry" value={form.industry} onChange={(v) => set("industry", v)} placeholder="e.g. Semiconductors" />
            <Select label="Exchange" value={form.exchange} onChange={(v) => set("exchange", v)} options={EXCHANGES} placeholder="Any exchange" />
            <Text label="Country" value={form.country} onChange={(v) => set("country", v)} placeholder="e.g. US" />

            <Group label="Market Cap ($)">
              <Num value={form.marketCapMin} onChange={(v) => set("marketCapMin", v)} placeholder="Min" />
              <Num value={form.marketCapMax} onChange={(v) => set("marketCapMax", v)} placeholder="Max" />
            </Group>
            <p className="-mt-2 text-[10px] text-muted-foreground/70">Tip: $10B = 10000000000</p>

            <Group label="P/E Ratio">
              <Num value={form.peMin} onChange={(v) => set("peMin", v)} placeholder="Min" />
              <Num value={form.peMax} onChange={(v) => set("peMax", v)} placeholder="Max" />
            </Group>

            <Group label="Price ($)">
              <Num value={form.priceMin} onChange={(v) => set("priceMin", v)} placeholder="Min" />
              <Num value={form.priceMax} onChange={(v) => set("priceMax", v)} placeholder="Max" />
            </Group>

            <Num label="Max Beta" value={form.betaMax} onChange={(v) => set("betaMax", v)} placeholder="e.g. 1.0" />
            <Num label="Min Dividend ($/yr)" value={form.dividendMin} onChange={(v) => set("dividendMin", v)} placeholder="e.g. 1.5" />
            <Num label="Min Revenue Growth (%)" value={form.revenueGrowthMin} onChange={(v) => set("revenueGrowthMin", v)} placeholder="e.g. 15" />
            <Num label="Max Results" value={form.limit} onChange={(v) => set("limit", v)} placeholder="25" />

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={loading} className="btn-neon flex-1 flex items-center justify-center gap-2 py-2.5">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Filter className="size-4" />}
                Screen
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
                title="Reset filters"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          </form>

          {/* ── Results ──────────────────────────────────────────── */}
          <div className="min-w-0">
            {error && (
              <div className="rounded-xl bg-neon-red/10 border border-neon-red/20 px-5 py-3 text-sm text-neon-red mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="glass-card flex items-center justify-center py-24">
                <Loader2 className="size-6 animate-spin text-neon-purple" />
              </div>
            ) : results === null ? (
              <div className="glass-card flex flex-col items-center justify-center py-24 text-center gap-3">
                <TrendingUp className="size-10 text-muted-foreground/40" />
                <h2 className="font-semibold">Build your screen</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Set any combination of filters on the left and hit Screen to
                  find matching stocks.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="glass-card flex flex-col items-center justify-center py-24 text-center gap-3">
                <Filter className="size-10 text-muted-foreground/40" />
                <h2 className="font-semibold">No matches</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  No stocks matched your criteria. Try loosening some filters.
                </p>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                  <span className="text-sm font-semibold">
                    {count} match{count === 1 ? "" : "es"}
                  </span>
                  <span className="text-xs text-muted-foreground">Sorted by market cap</span>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th style={{ textAlign: "left" }}>Name</th>
                        <th style={{ textAlign: "left" }}>Sector</th>
                        <th>Price</th>
                        <th>Market Cap</th>
                        <th>P/E</th>
                        <th>Beta</th>
                        <th>Div/yr</th>
                        <th>Rev Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.symbol} className="hover:bg-surface/60 transition-colors">
                          <td style={{ textAlign: "left" }}>
                            <Link href={`/stock/${r.symbol}`} className="font-bold text-neon-purple hover:underline">
                              {r.symbol}
                            </Link>
                          </td>
                          <td style={{ textAlign: "left", maxWidth: 200 }} className="truncate">{r.name ?? "—"}</td>
                          <td style={{ textAlign: "left" }} className="text-muted-foreground">{r.sector ?? "—"}</td>
                          <td>{fmtCurrency(r.price)}</td>
                          <td>{fmtNum(r.marketCap, { compact: true })}</td>
                          <td>{fmtNum(r.pe)}</td>
                          <td>{fmtNum(r.beta)}</td>
                          <td>{r.dividendYield ? fmtCurrency(r.dividendYield) : "—"}</td>
                          <td className={(r.revenueGrowth ?? 0) < 0 ? "text-neon-red" : (r.revenueGrowth ?? 0) > 0 ? "text-neon-green" : ""}>
                            {r.revenueGrowth != null ? fmtPct(r.revenueGrowth * 100) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Field primitives ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-muted-foreground mb-1.5">{children}</label>;
}

const inputCls =
  "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-neon-purple/60 focus:shadow-[0_0_0_3px_rgba(168,85,247,0.08)] transition-all placeholder:text-muted-foreground/50";

function Text({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  );
}

function Num({ label, value, onChange, placeholder }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex-1">
      {label && <Label>{label}</Label>}
      <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
