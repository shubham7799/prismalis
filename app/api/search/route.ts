import { NextRequest, NextResponse } from "next/server";
import { searchTickersServer } from "@/lib/fmp";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";

  try {
    const results = await searchTickersServer(q);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to search tickers" },
      { status: 500 }
    );
  }
}