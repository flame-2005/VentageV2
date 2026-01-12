"use node"

import * as cheerio from "cheerio";
import { ScrapedPost } from "../scraper/types";

export async function scrapeMotilalOswalLatest(
  url: string,
  limit = 10
): Promise<ScrapedPost[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const posts: ScrapedPost[] = [];
  const seen = new Set<string>();

  const itemSelector = "a.blog-item";

  $(itemSelector)
    .slice(0, limit) // ✅ latest posts only
    .each((_, el) => {
      const card = $(el);

      const link = card.attr("href");
      const title = card.find(".bi-title").text().trim();
      const author = card
        .find(".blog-item-author")
        .text()
        .replace(/^By\s+/i, "")
        .trim();

      const published = card
    .find(".blog-item-info span")
        .first()
        .text()
        .trim();

      const image = card.find("img").attr("src") || null;

      if (!link || !title) return;

      const absoluteLink = new URL(link, url).toString();
      if (seen.has(absoluteLink)) return;
      seen.add(absoluteLink);

      posts.push({
        title,
        link: absoluteLink,
        published,
        author: author || "MOFSL",
        image,
      });
    });

  return posts;
}
