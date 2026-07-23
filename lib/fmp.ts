const BASE_URL = "https://financialmodelingprep.com/api/v3";

export async function searchTickersServer(q: string) {
  if (!q) return [];

  const res = await fetch(
    `${BASE_URL}/search?query=${encodeURIComponent(q)}&limit=10&exchange=NASDAQ&apikey=${process.env.FMP_API_KEY}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch tickers");
  }

  const data = await res.json();

  return data.map((item: any) => ({
    symbol: item.symbol,
    name: item.name,
    exchange: item.exchangeShortName,
  }));
}