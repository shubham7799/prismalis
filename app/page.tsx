"use client";

import Link from "next/link";
import { Activity, BarChart3, Sparkles, TrendingUp, Zap } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { Header } from "@/components/Header";

const TRENDING = ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META", "AMD"];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-6 pt-24 pb-32">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-neon-purple/30 bg-neon-purple/5 px-4 py-1.5 text-xs font-medium text-neon-purple backdrop-blur">
            <Sparkles className="size-3.5" />
            Real-time US market data · Powered by Prismalis
          </span>

          <h1 className="mt-6 text-5xl md:text-7xl font-extrabold leading-[1.08] tracking-tight">
            Research stocks<br />
            <span className="gradient-text">at the speed of thought.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base text-muted-foreground leading-relaxed">
            One search box. Every US ticker. Live price, 12 quarters of
            fundamentals, ratio analysis, and gorgeous charts.
          </p>

          <div className="mt-10 w-full max-w-2xl">
            <SearchBar autoFocus />
          </div>

          {/* Trending pills */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground/60 mr-1">
              Trending
            </span>
            {TRENDING.map((t) => (
              <Link
                key={t}
                href={`/stock/${t}`}
                className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-bold hover:border-neon-purple/60 hover:text-neon-purple hover:bg-neon-purple/5 transition-all duration-150"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-28 grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<Zap className="size-5 text-neon-amber" />}
            title="Live price & metrics"
            body="Quote, market cap, P/E, EPS, ROE, beta, 52-week range — all in one glance."
            accent="amber"
          />
          <FeatureCard
            icon={<BarChart3 className="size-5 text-neon-purple" />}
            title="Beautiful charts"
            body="1M → 5Y price history with neon gradient area charts and interactive tooltips."
            accent="purple"
          />
          <FeatureCard
            icon={<TrendingUp className="size-5 text-neon-green" />}
            title="Deep fundamentals"
            body="Full income, balance sheet, cash flow, key metrics, ratios & growth — 12 periods."
            accent="green"
          />
        </div>

        {/* CTA */}
        <div className="mt-16 glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold">Track your watchlist</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to save stocks and monitor them with live data.
            </p>
          </div>
          <Link
            href="/auth"
            className="btn-neon shrink-0 text-sm px-6 py-2.5"
          >
            Get started free
          </Link>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: "amber" | "purple" | "green";
}) {
  const glow = {
    amber: "hover:border-neon-amber/30 hover:shadow-[0_0_24px_rgba(245,158,11,0.07)]",
    purple: "hover:border-neon-purple/30 hover:shadow-[0_0_24px_rgba(168,85,247,0.07)]",
    green: "hover:border-neon-green/30 hover:shadow-[0_0_24px_rgba(34,197,94,0.07)]",
  }[accent];

  return (
    <div className={`glass-card p-6 transition-all duration-200 ${glow}`}>
      <div className="inline-flex size-10 items-center justify-center rounded-lg bg-surface border border-border">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
