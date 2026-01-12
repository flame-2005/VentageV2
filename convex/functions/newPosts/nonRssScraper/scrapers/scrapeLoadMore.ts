"use node"

import * as cheerio from "cheerio";
import { ScrapedPost } from "../scraper/types";

interface LatestListOptions {
  itemSelector: string;
  linkSelector?: string;
  titleSelector: string;
  authorSelector?: string;
  dateSelector?: string;
  defaultAuthor?: string;
}

export async function scrapeLatestList(
  url: string,
  options: LatestListOptions
): Promise<Omit<ScrapedPost, "image">[]> {
  const {
    itemSelector,
    linkSelector,
    titleSelector,
    authorSelector,
    dateSelector,
    defaultAuthor = "MOFSL",
  } = options;

  // ✅ Convex-safe fetch
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const posts: Omit<ScrapedPost, "image">[] = [];
  const seen = new Set<string>();

  $(itemSelector).each((_, el) => {
    const item = $(el);

    // 🔗 Link
    let link = item.attr("href");
    if (!link && linkSelector) {
      link = item.find(linkSelector).attr("href");
    }

    // 📝 Title
    const title = item.find(titleSelector).text().trim();

    // ✍️ Author
    const author = authorSelector
      ? item.find(authorSelector).text().trim() || defaultAuthor
      : defaultAuthor;

    // 📅 Date
    const published = dateSelector
      ? item.find(dateSelector).text().trim()
      : "";

    if (!link || !title) return;

    const absLink = new URL(link, url).toString();
    if (seen.has(absLink)) return;
    seen.add(absLink);

    posts.push({
      title,
      link: absLink,
      published,
      author,
    });
  });

  return posts;
}
