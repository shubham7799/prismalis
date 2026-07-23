"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { fmtCurrency, fmtNum, fmtPct } from "@/lib/format";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";

// ---------- Mock data ----------
const profile = {
  symbol: "NVDA",
  companyName: "NVIDIA Corporation",
  exchangeShortName: "NASDAQ",
  sector: "Technology",
  industry: "Semiconductors",
  country: "US",
  image: "https://images.financialmodelingprep.com/symbol/NVDA.png",
  ceo: "Jensen Huang",
  fullTimeEmployees: 29600,
  website: "https://www.nvidia.com",
  description:
    "NVIDIA Corporation designs GPUs, AI chips, and computing platforms powering modern AI infrastructure.",
};

const quote = {
  price: 138.42,
  change: 3.21,
  changesPercentage: 2.37,
  marketCap: 3_400_000_000_000,
  pe: 65.4,
  eps: 2.11,
  yearHigh: 152.89,
  yearLow: 47.32,
  volume: 245_000_000,
};

const peers = [
  { symbol: "AMD", name: "Advanced Micro Devices", price: 168.5, change: 1.2, changesPercentage: 0.72, marketCap: 272e9 },
  { symbol: "INTC", name: "Intel Corporation", price: 24.18, change: -0.31, changesPercentage: -1.27, marketCap: 103e9 },
];

// ---------- Page ----------
export default function DemoPage() {
  const up = quote.change >= 0;

  return (
    <div className="min-h-screen">
      <Header />

      <div className="border-b bg-background/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <SearchBar />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="rounded-xl border px-4 py-2 text-xs">
          Demo page — mock data
        </div>

        {/* Header */}
        <div className="p-6 border rounded-xl">
          <div className="flex justify-between">
            <div className="flex gap-4">
              <Image
                src={profile.image}
                alt={profile.companyName}
                width={56}
                height={56}
                className="size-14 rounded-xl object-cover"
              />
              <div>
                <h1 className="text-3xl font-bold">{profile.companyName}</h1>
                <span className="text-sm">{profile.symbol}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold">
                {fmtCurrency(quote.price)}
              </div>
              <div className={up ? "text-green-500" : "text-red-500"}>
                {fmtCurrency(quote.change)} ({fmtPct(quote.changesPercentage)})
              </div>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Metric label="Market Cap" value={fmtCurrency(quote.marketCap, true)} />
          <Metric label="P/E" value={fmtNum(quote.pe)} />
          <Metric label="EPS" value={fmtCurrency(quote.eps)} />
        </section>

        <PriceChart />

        {/* Peers */}
        <section>
          <h2 className="text-sm font-semibold">Peers</h2>
          <div className="grid grid-cols-2 gap-3">
            {peers.map((p) => (
              <Link
                key={p.symbol}
                href={`/stock/${p.symbol}`}
                className="border p-4 rounded-xl"
              >
                <div className="font-bold">{p.symbol}</div>
                <div className="text-sm">{p.name}</div>
                <div>{fmtCurrency(p.price)}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

// ---------- Components ----------

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border p-4 rounded-xl">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function PriceChart() {
  const [range, setRange] = useState("1Y");

  const data = Array.from({ length: 50 }).map((_, i) => ({
    date: i,
    close: 100 + Math.sin(i / 5) * 10,
  }));

  return (
    <div className="border p-6 rounded-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Price trend</h3>
          <p className="text-sm text-muted-foreground">Current range: {range}</p>
        </div>
        <div className="flex gap-2">
          {['1M', '3M', '1Y'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                range === r
                  ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                  : 'border-border hover:border-emerald-400/60 hover:bg-muted'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => fmtCurrency(typeof value === 'number' ? value : Number(value ?? 0))} />
            <Area type="monotone" dataKey="close" stroke="#8884d8" fill="#8884d8" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}