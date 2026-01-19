"use node"

import YahooFinance from "yahoo-finance2";
import { delay } from "../functions/newPosts/nonRssScraper/utils/delay";
import * as cheerio from "cheerio";

const yahooFinance = new YahooFinance();

interface StockData {
  marketCap: number | null;
}

function getSeriesDescription(series: string): string {
  const descriptions: Record<string, string> = {
    SM: "SME",
    E1: "Enhanced Surveillance",
    E2: "Enhanced Surveillance",
    IV: "Institutional Variant",
    X1: "Special Series",
    RR: "Rights Issue",
    ST: "Surveillance (Trade-to-Trade)",
    BE: "Book Entry (Trade-to-Trade)",
    BZ: "Delisted/Suspended",
    IL: "Illiquid",
  };
  return descriptions[series] || series;
}

export async function fetchYahooFinanceData(
  symbol: string,
  exchange: "NSE" | "BSE",
): Promise<StockData & { isSME?: boolean; series?: string }> {
  // Extract series suffix and categorize
  const seriesMatch = symbol.match(/-(SM|E1|E2|IV|X1|RR|ST|BE|BZ|IL)$/);
  const series = seriesMatch ? seriesMatch[1] : null;
  const cleanSymbol = symbol.replace(/-(SM|E1|E2|IV|X1|RR|ST|BE|BZ|IL)$/, "");

  const isSME = series === "SM";
  const isSurveillance = ["E1", "E2", "BE", "ST"].includes(series || "");

  // Build ticker variations
  const tickers = [];

  if (exchange === "NSE") {
    // Try with suffix first
    if (series) {
      tickers.push({ ticker: `${symbol}.NS`, isSME, series });
    }
    // Try without suffix
    tickers.push({ ticker: `${cleanSymbol}.NS`, isSME: false, series: null });
    // Try BSE as fallback
    if (series) {
      tickers.push({ ticker: `${symbol}.BO`, isSME, series });
    }
    tickers.push({ ticker: `${cleanSymbol}.BO`, isSME: false, series: null });
  } else {
    // BSE primary
    if (series) {
      tickers.push({ ticker: `${symbol}.BO`, isSME, series });
    }
    tickers.push({ ticker: `${cleanSymbol}.BO`, isSME: false, series: null });
    // NSE fallback
    if (series) {
      tickers.push({ ticker: `${symbol}.NS`, isSME, series });
    }
    tickers.push({ ticker: `${cleanSymbol}.NS`, isSME: false, series: null });
  }

  for (const { ticker, isSME, series } of tickers) {
    try {
      console.log(
        `  Fetching ${ticker}...${series ? ` (${getSeriesDescription(series)})` : ""}`,
      );

      const quote = await yahooFinance.quote(ticker, {
        fields: ["marketCap", "quoteType"],
      });

      const marketCap: number | null = quote.marketCap ?? null;

      if (
        quote.quoteType &&
        !["EQUITY", "OTHER", "NONE"].includes(quote.quoteType)
      ) {
        console.log(
          `  ⚠ ${ticker}: Unsupported quoteType (${quote.quoteType})`,
        );
        continue;
      }

      if (marketCap) {
        console.log(
          `  ✓ ${ticker}: ₹${(marketCap / 1e7).toFixed(2)} Cr${
            series ? ` (${series})` : ""
          }`,
        );
        return { marketCap, isSME, series: series || undefined };
      } else {
        console.log(
          `  ⚠ ${ticker}: Market cap unavailable${series ? ` (${series})` : ""}`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.log(`  ✗ ${ticker}: ${msg.substring(0, 60)}`);
    }
  }

  console.log(`  ✗ ${symbol}: Market cap not found`);
  return { marketCap: null, series: series || undefined };
}

export async function fetchMarketCapFromScreener(
  symbol: string | undefined,
  retries = 3,
): Promise<number | null> {
  if (!symbol) return null;

  const cleanSymbol = symbol.replace(
    /-(SM|E1|E2|IV|X1|RR|ST|BE|BZ|IL|W1|IT)$/,
    "",
  );

  const url = `https://www.screener.in/company/${cleanSymbol}/`;

  try {
    // 🕒 Random polite delay (1.5s – 3s)
    const time = 1500 + Math.random() * 1500;
    await delay(time);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
        Referer: "https://www.screener.in/",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 🚫 Handle rate limit
    if (response.status === 429) {
      if (retries > 0) {
        const backoff = (4 - retries) * 3000; // 3s, 6s, 9s
        console.log(
          `⏳ 429 received for ${cleanSymbol}, retrying in ${backoff}ms...`,
        );
        await delay(backoff);
        return fetchMarketCapFromScreener(symbol, retries - 1);
      }

      console.log(`❌ Rate limited permanently for ${cleanSymbol}`);
      return null;
    }

    if (!response.ok) {
      console.log(`Screener returned ${response.status} for ${cleanSymbol}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let marketCapCr: number | null = null;

    $("li").each((_, el) => {
      const label = $(el).find("span.name").text().trim();
      if (label === "Market Cap") {
        const valueText = $(el).find("span.number").text().trim();
        if (valueText) {
          marketCapCr = parseFloat(valueText.replace(/,/g, ""));
        }
      }
    });

    if (!marketCapCr) {
      console.log(`Market cap not found for ${cleanSymbol}`);
      return null;
    }

    // Convert Crores → Rupees
    return marketCapCr * 1e7;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.log(`⏱ Timeout for ${cleanSymbol}`);
    } else {
      console.log(`Screener scrape failed for ${cleanSymbol}:`, err);
    }
    return null;
  }
}

export async function fetchMarketCap(
  symbol: string,
  exchange: "NSE" | "BSE",
): Promise<{
  marketCap: number | null;
  source: "YAHOO" | "SCREENER" | null;
  isSME?: boolean;
  series?: string;
}> {
  // 1️⃣ Try Yahoo Finance first
  try {
    const yahooResult = await fetchYahooFinanceData(symbol, exchange);

    if (yahooResult.marketCap) {
      return {
        marketCap: yahooResult.marketCap,
        source: "YAHOO",
        isSME: yahooResult.isSME,
        series: yahooResult.series,
      };
    }
  } catch (err) {
    console.log(`Yahoo fetch failed for ${symbol}`, err);
  }

  // 2️⃣ Fallback to Screener (slow)
  try {
    const screenerCap = await fetchMarketCapFromScreener(symbol);

    if (screenerCap) {
      return {
        marketCap: screenerCap,
        source: "SCREENER",
      };
    }
  } catch (err) {
    console.log(`Screener fallback failed for ${symbol}`, err);
  }

  // 3️⃣ Nothing worked
  return {
    marketCap: null,
    source: null,
  };
}
