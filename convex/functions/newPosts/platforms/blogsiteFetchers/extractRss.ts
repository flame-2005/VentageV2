"use node"

import * as cheerio from "cheerio";

export function extractRSSLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const feeds: string[] = [];

  $('link[type="application/rss+xml"], link[type="application/atom+xml"]').each(
    (_, el) => {
      const href = $(el).attr("href");
      if (href) feeds.push(href.startsWith("http") ? href : baseUrl + href);
    }
  );

  // Fallback guess patterns:
  const guesses = ["feed", "rss", "atom"].map((p) => `${baseUrl}/${p}`);
  return [...feeds, ...guesses];
}
