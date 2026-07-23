const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Token helpers ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("prismalis_token");
}
export function setToken(token: string) {
  localStorage.setItem("prismalis_token", token);
}
export function clearToken() {
  localStorage.removeItem("prismalis_token");
}

// ── Core fetch ───────────────────────────────────────────────────────────────

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) throw new ApiError(body?.detail ?? "Request failed", res.status);
  return body as T;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Streaming fetch (text/plain body, chunked) ────────────────────────────────

async function streamReq(
  path: string,
  body: Record<string, unknown>,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(errBody?.detail ?? "Request failed", res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) onChunk(chunk);
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  auth_provider: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  exchangeShortName?: string;
};

export type CompanyProfile = {
  symbol: string;
  companyName: string;
  currency: string;
  exchangeFullName: string;
  sector: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  country: string;
  ipoDate: string;
  fullTimeEmployees: number;
  image: string;
  beta: number;
  isEtf: boolean;
  isActivelyTrading: boolean;
};

export type Quote = {
  symbol: string;
  exchange: string;
  price: number;
  change: number;
  changePercentage: number;
  volume: number;
  avgVolume: number;
  dayLow: number;
  dayHigh: number;
  yearLow: number;
  yearHigh: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  open: number;
  previousClose: number;
};

export type HistoricalPrice = { date: string; open: number; high: number; low: number; close: number; volume: number };
export type HistoricalData = { symbol: string; historical: HistoricalPrice[] };

export type Dataset = {
  symbol: string;
  profile: CompanyProfile[];
  quote: Quote[];
  income_statements: Record<string, unknown>[];
  balance_sheets: Record<string, unknown>[];
  cash_flow_statements: Record<string, unknown>[];
  key_metrics: Record<string, unknown>[];
  ratios: Record<string, unknown>[];
  financial_growth: Record<string, unknown>[];
  enterprise_values: Record<string, unknown>[];
};

export type WatchlistItem = CompanyProfile & Quote;

// ── Assistant (AI chat) ──────────────────────────────────────────────────────

export type Chat = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string | null;
};

export type ChatDetail = Chat & { messages: ChatMessage[] };

// ── Screener ─────────────────────────────────────────────────────────────────

export type ScreenerFilters = {
  sector?: string;
  industry?: string;
  marketCapMin?: number;
  marketCapMax?: number;
  peMin?: number;
  peMax?: number;
  priceMin?: number;
  priceMax?: number;
  betaMax?: number;
  dividendMin?: number;
  revenueGrowthMin?: number;
  exchange?: string;
  country?: string;
  limit?: number;
};

export type ScreenerResult = {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  country: string | null;
  price: number | null;
  marketCap: number | null;
  pe: number | null;
  beta: number | null;
  dividendYield: number | null;
  revenueGrowth: number | null;
  volume: number | null;
};

export type ScreenerResponse = {
  count: number;
  filters: Record<string, unknown>;
  results: ScreenerResult[];
};

// ── API surface ──────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (email: string, password: string, full_name?: string) =>
      req<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name }),
      }),
    login: (email: string, password: string) =>
      req<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => req<User>("/api/auth/me"),
    googleLogin: (id_token: string) =>
      req<AuthResponse>("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ id_token }),
      }),
  },
  stocks: {
    search: (query: string, limit = 10) =>
      req<SearchResult[]>(`/api/us/search?query=${encodeURIComponent(query)}&limit=${limit}`),
    profile: (symbol: string) =>
      req<CompanyProfile[]>(`/api/us/stocks/${symbol}/profile`),
    quote: (symbol: string) =>
      req<Quote[]>(`/api/us/stocks/${symbol}/quote`),
    dataset: (symbol: string, period = "annual", limit = 5) =>
      req<Dataset>(`/api/us/stocks/${symbol}/dataset?period=${period}&limit=${limit}`),
    historicalPrices: (symbol: string, timeseries?: number) => {
      const sp = timeseries ? `?timeseries=${timeseries}` : "";
      return req<HistoricalData>(`/api/us/stocks/${symbol}/historical-prices${sp}`);
    },
  },
  watchlist: {
    list: () => req<WatchlistItem[]>("/api/watchlist"),
    add: (symbol: string) => req<{ symbol: string; status: string }>(`/api/watchlist/${symbol}`, { method: "POST" }),
    remove: (symbol: string) => req<void>(`/api/watchlist/${symbol}`, { method: "DELETE" }),
  },
  assistant: {
    listChats: () => req<Chat[]>("/api/assistant/chats"),
    getChat: (id: string) => req<ChatDetail>(`/api/assistant/chats/${id}`),
    renameChat: (id: string, title: string) =>
      req<Chat>(`/api/assistant/chats/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
    deleteChat: (id: string) =>
      req<void>(`/api/assistant/chats/${id}`, { method: "DELETE" }),
    startChatStream: (message: string, onChunk: (chunk: string) => void, signal?: AbortSignal) =>
      streamReq("/api/assistant/chats/messages", { message, stream: true }, onChunk, signal),
    sendMessageStream: (id: string, message: string, onChunk: (chunk: string) => void, signal?: AbortSignal) =>
      streamReq(`/api/assistant/chats/${id}/messages`, { message, stream: true }, onChunk, signal),
  },
  screener: {
    screen: (filters: ScreenerFilters) =>
      req<ScreenerResponse>("/api/screener", {
        method: "POST",
        body: JSON.stringify(filters),
      }),
  },
};
