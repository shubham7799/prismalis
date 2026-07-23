"use client";

import { useEffect, useState, useCallback } from "react";
import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  ArrowUpRight, ArrowDownRight, Bookmark, BookmarkCheck,
  Building2, ExternalLink, Globe, Loader2, Users,
} from "lucide-react";

import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { useAuth } from "@/lib/auth-store";
import { api, ApiError, CompanyProfile, Dataset, HistoricalPrice, Quote } from "@/lib/api";
import { fmtCurrency, fmtNum, fmtPct } from "@/lib/format";

// ── Range config ─────────────────────────────────────────────────────────────

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "3Y", days: 1095 },
  { label: "5Y", days: 1825 },
] as const;
type RangeLabel = (typeof RANGES)[number]["label"];

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Income", "Balance Sheet", "Cash Flow", "Key Metrics", "Ratios", "Growth"] as const;
type Tab = (typeof TABS)[number];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawSymbol } = use(params);
  const symbol = rawSymbol.toUpperCase();

  const { user } = useAuth();

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [history, setHistory] = useState<HistoricalPrice[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<RangeLabel>("1Y");
  const [tab, setTab] = useState<Tab>("Overview");
  const [inWatchlist, setInWatchlist] = useState(false);
  const [wlLoading, setWlLoading] = useState(false);
  const [period, setPeriod] = useState<"annual" | "quarter">("annual");

  // ── Fetch dataset ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) { setLoadingData(false); return; }
    setLoadingData(true);
    setError("");

    api.stocks.dataset(symbol, period, 8)
      .then(setDataset)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoadingData(false));
  }, [symbol, user, period]);

  // ── Fetch price history ──────────────────────────────────────────────────

  const fetchHistory = useCallback((days: number) => {
    if (!user) return;
    setLoadingChart(true);
    api.stocks.historicalPrices(symbol, days)
      .then((d) => setHistory((d.historical ?? []).slice().reverse()))
      .catch(() => setHistory([]))
      .finally(() => setLoadingChart(false));
  }, [symbol, user]);

  useEffect(() => {
    const days = RANGES.find((r) => r.label === range)?.days ?? 365;
    fetchHistory(days);
  }, [range, fetchHistory]);

  // ── Watchlist ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    api.watchlist.list()
      .then((items) => setInWatchlist(items.some((i) => i.symbol === symbol)))
      .catch(() => {});
  }, [symbol, user]);

  async function toggleWatchlist() {
    if (!user) return;
    setWlLoading(true);
    try {
      if (inWatchlist) {
        await api.watchlist.remove(symbol);
        setInWatchlist(false);
      } else {
        await api.watchlist.add(symbol);
        setInWatchlist(true);
      }
    } finally {
      setWlLoading(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const profile = dataset?.profile?.[0] as CompanyProfile | undefined;
  const quote = dataset?.quote?.[0] as Quote | undefined;
  const up = (quote?.change ?? 0) >= 0;

  // ── Not authed ───────────────────────────────────────────────────────────

  if (!user && !loadingData) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="border-b border-border/40 bg-background/60 backdrop-blur">
          <div className="mx-auto max-w-6xl px-6 py-3">
            <SearchBar size="sm" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <div className="size-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-2xl">
            🔒
          </div>
          <h2 className="text-xl font-bold">Sign in to view stock data</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Create a free Prismalis account to access live stock data, fundamentals, and charts.
          </p>
          <Link href="/auth" className="btn-neon mt-2">Sign in / Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      {/* Search bar sub-header */}
      <div className="sticky top-[57px] z-20 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-2.5">
          <SearchBar size="sm" />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {error && (
          <div className="rounded-xl bg-neon-red/10 border border-neon-red/20 px-5 py-3 text-sm text-neon-red">
            {error}
          </div>
        )}

        {/* ── Company header ─────────────────────────────────────────── */}
        {loadingData ? (
          <HeaderSkeleton />
        ) : (
          <div className="glass-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              {/* Left: logo + name */}
              <div className="flex items-start gap-4">
                {profile?.image ? (
                  <Image
                    src={profile.image}
                    alt={profile.companyName}
                    width={56}
                    height={56}
                    className="size-14 rounded-xl object-contain bg-white/5 border border-border p-1 shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="size-14 rounded-xl bg-surface border border-border flex items-center justify-center text-xl font-bold text-neon-purple shrink-0">
                    {symbol.slice(0, 2)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{profile?.companyName ?? symbol}</h1>
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {symbol}
                    </span>
                    {profile?.exchangeFullName && (
                      <span className="rounded-full border border-neon-purple/30 bg-neon-purple/5 px-2.5 py-0.5 text-xs font-medium text-neon-purple">
                        {profile.exchangeFullName}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {profile?.sector && (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" /> {profile.sector}
                      </span>
                    )}
                    {profile?.industry && <span>{profile.industry}</span>}
                    {profile?.country && <span>🌍 {profile.country}</span>}
                    {profile?.ceo && (
                      <span className="flex items-center gap-1">
                        <Users className="size-3" /> {profile.ceo}
                      </span>
                    )}
                    {profile?.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-neon-purple transition-colors"
                      >
                        <Globe className="size-3" />
                        Website
                        <ExternalLink className="size-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: price + watchlist */}
              <div className="flex items-start gap-4">
                <div className="text-right">
                  <div className="text-3xl font-extrabold tabular-nums">
                    {quote ? fmtCurrency(quote.price) : "—"}
                  </div>
                  {quote && (
                    <div className={`flex items-center justify-end gap-1 text-sm font-semibold mt-0.5 ${up ? "badge-up" : "badge-down"}`}>
                      {up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                      {fmtCurrency(Math.abs(quote.change))}
                      <span>({fmtPct(quote.changePercentage)})</span>
                    </div>
                  )}
                </div>
                {user && (
                  <button
                    onClick={toggleWatchlist}
                    disabled={wlLoading}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                      inWatchlist
                        ? "border-neon-amber/40 bg-neon-amber/10 text-neon-amber hover:bg-neon-amber/15"
                        : "border-border hover:border-neon-amber/40 hover:text-neon-amber"
                    }`}
                    title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                  >
                    {wlLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : inWatchlist ? (
                      <BookmarkCheck className="size-4" />
                    ) : (
                      <Bookmark className="size-4" />
                    )}
                    {inWatchlist ? "Saved" : "Watchlist"}
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            {profile?.description && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {profile.description}
              </p>
            )}
          </div>
        )}

        {/* ── Metrics grid ───────────────────────────────────────────── */}
        {!loadingData && quote && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <MetricCard label="Market Cap"   value={fmtCurrency(quote.marketCap, true)} />
            <MetricCard label="Volume"       value={fmtNum(quote.volume, { compact: true })} />
            <MetricCard label="52w High"     value={fmtCurrency(quote.yearHigh)} accent="green" />
            <MetricCard label="52w Low"      value={fmtCurrency(quote.yearLow)}  accent="red" />
            <MetricCard label="P/Avg 50"     value={fmtCurrency(quote.priceAvg50)} />
            <MetricCard label="P/Avg 200"    value={fmtCurrency(quote.priceAvg200)} />
          </div>
        )}

        {/* ── Price chart ────────────────────────────────────────────── */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-semibold">Price History</h2>
              {quote && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fmtCurrency(quote.dayLow)} — {fmtCurrency(quote.dayHigh)} today
                </p>
              )}
            </div>
            <div className="flex gap-1 flex-wrap justify-end">
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setRange(r.label)}
                  className={`tab-pill ${range === r.label ? "active" : ""}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {loadingChart ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-neon-purple" />
            </div>
          ) : history.length > 0 ? (
            <PriceChart data={history} up={up} />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              No price data available
            </div>
          )}
        </div>

        {/* ── Financial tabs ─────────────────────────────────────────── */}
        {!loadingData && dataset && (
          <div className="glass-card overflow-hidden">
            {/* Tab bar */}
            <div className="border-b border-border/60 px-4 pt-4">
              <div className="flex gap-1 overflow-x-auto pb-3 hide-scrollbar">
                {TABS.map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`tab-pill shrink-0 ${tab === t ? "active" : ""}`}>
                    {t}
                  </button>
                ))}
                <div className="ml-auto flex gap-1 shrink-0">
                  {(["annual", "quarter"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`tab-pill ${period === p ? "active" : ""}`}
                    >
                      {p === "annual" ? "Annual" : "Quarterly"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4">
              {tab === "Overview"       && <OverviewTab profile={profile} quote={quote} />}
              {tab === "Income"         && <DataTable rows={dataset.income_statements} />}
              {tab === "Balance Sheet"  && <DataTable rows={dataset.balance_sheets} />}
              {tab === "Cash Flow"      && <DataTable rows={dataset.cash_flow_statements} />}
              {tab === "Key Metrics"    && <DataTable rows={dataset.key_metrics} />}
              {tab === "Ratios"         && <DataTable rows={dataset.ratios} />}
              {tab === "Growth"         && <DataTable rows={dataset.financial_growth} />}
            </div>
          </div>
        )}

        {loadingData && <TabSkeleton />}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PriceChart({ data, up }: { data: HistoricalPrice[]; up: boolean }) {
  const color = up ? "#22c55e" : "#ef4444";
  const id = "priceGrad";

  const chartData = data.map((d) => ({
    date: d.date.slice(2, 10).replace(/-/g, "/"),
    close: d.close,
  }));

  const minV = Math.min(...chartData.map((d) => d.close)) * 0.995;
  const maxV = Math.max(...chartData.map((d) => d.close)) * 1.005;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.08)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#7070a0", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minV, maxV]}
            tick={{ fill: "#7070a0", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmtCurrency(v)}
            width={64}
          />
          <Tooltip
            contentStyle={{ background: "#10101e", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#7070a0" }}
            itemStyle={{ color }}
            formatter={(v) => [fmtCurrency(Number(v ?? 0)), "Close"]}
          />
          <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function OverviewTab({ profile, quote }: { profile?: CompanyProfile; quote?: Quote }) {
  const rows = [
    { label: "Open",           value: fmtCurrency(quote?.open) },
    { label: "Prev Close",     value: fmtCurrency(quote?.previousClose) },
    { label: "Day Range",      value: quote ? `${fmtCurrency(quote.dayLow)} – ${fmtCurrency(quote.dayHigh)}` : "—" },
    { label: "52-week Range",  value: quote ? `${fmtCurrency(quote.yearLow)} – ${fmtCurrency(quote.yearHigh)}` : "—" },
    { label: "Volume",         value: fmtNum(quote?.volume, { compact: true }) },
    { label: "Avg Volume",     value: fmtNum(quote?.avgVolume, { compact: true }) },
    { label: "Market Cap",     value: fmtCurrency(quote?.marketCap, true) },
    { label: "Beta",           value: fmtNum(profile?.beta, { digits: 2 }) },
    { label: "50-day MA",      value: fmtCurrency(quote?.priceAvg50) },
    { label: "200-day MA",     value: fmtCurrency(quote?.priceAvg200) },
    { label: "Employees",      value: fmtNum(profile?.fullTimeEmployees, { compact: false, digits: 0 }) },
    { label: "IPO Date",       value: profile?.ipoDate ?? "—" },
    { label: "Country",        value: profile?.country ?? "—" },
    { label: "CEO",            value: profile?.ceo ?? "—" },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Market Data</h3>
        <div className="space-y-2">
          {rows.slice(0, 8).map((r) => (
            <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <span className="text-sm font-medium tabular-nums">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Company</h3>
        <div className="space-y-2">
          {rows.slice(8).map((r) => (
            <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <span className="text-sm font-medium">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const SKIP_COLS = new Set(["symbol", "cik", "fetched_at", "reported_currency"]);
const PERIOD_COL = "fiscal_year";

function DataTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows?.length) return <p className="text-sm text-muted-foreground py-6 text-center">No data available.</p>;

  const periods = rows.map((r) => String(r[PERIOD_COL] ?? r.date ?? ""));
  const keys = Object.keys(rows[0]).filter((k) => !SKIP_COLS.has(k) && k !== PERIOD_COL && k !== "date");

  function fmt(v: unknown): string {
    if (v == null || v === "") return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    const n = Number(v);
    if (!isNaN(n)) {
      const abs = Math.abs(n);
      if (abs >= 1e9)  return `${(n / 1e9).toFixed(2)}B`;
      if (abs >= 1e6)  return `${(n / 1e6).toFixed(2)}M`;
      if (abs >= 1e3)  return `${(n / 1e3).toFixed(2)}K`;
      if (abs < 10)    return n.toFixed(4);
      return n.toFixed(2);
    }
    return String(v);
  }

  function label(key: string): string {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Metric</th>
            {periods.map((p, i) => <th key={i}>{p}</th>)}
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key}>
              <td>{label(key)}</td>
              {rows.map((r, i) => {
                const v = r[key];
                const n = Number(v);
                const isNeg = !isNaN(n) && n < 0;
                return (
                  <td key={i} className={isNeg ? "text-neon-red" : ""}>
                    {fmt(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Skeleton loaders ──────────────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex gap-4">
        <div className="skeleton size-14 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-7 w-48" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="space-y-2 text-right">
          <div className="skeleton h-9 w-28 ml-auto" />
          <div className="skeleton h-4 w-20 ml-auto" />
        </div>
      </div>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="glass-card p-6 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton h-8 w-full" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

function MetricCard({
  label, value, accent,
}: { label: string; value: string; accent?: "green" | "red" }) {
  return (
    <div className="metric-card">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${
        accent === "green" ? "text-neon-green" : accent === "red" ? "text-neon-red" : ""
      }`}>
        {value}
      </div>
    </div>
  );
}
