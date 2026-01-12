"use node";


import * as cheerio from "cheerio";
import { ScrapedPost } from "../scraper/types";

export async function scrapeMJKInvestmentBlog(
  url: string,
  limit = 10 // 👈 control how many latest posts you want
): Promise<ScrapedPost[]> {
  console.log(`🌐 Fetching MJK Investment blog: ${url}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const posts: ScrapedPost[] = [];
  const seen = new Set<string>();

  $(".card").each((_, el) => {
    if (posts.length >= limit) return false; // ⛔ stop once limit reached

    const card = $(el);

    // -----------------------------
    // TITLE + LINK
    // -----------------------------
    const titleEl = card.find(".card-headline a").first();
    const title = titleEl.text().trim();
    const link = titleEl.attr("href");

    if (!title || !link) return;

    const absoluteLink = new URL(link, url).toString();
    if (seen.has(absoluteLink)) return;
    seen.add(absoluteLink);

    // -----------------------------
    // DATE
    // -----------------------------
    const published = card
      .find(".card-post-date span")
      .first()
      .text()
      .replace(/posted on/i, "")
      .trim();

    // -----------------------------
    // AUTHOR
    // -----------------------------
    const author = card
      .find(".card-author-name a")
      .first()
      .text()
      .replace(/^By\s+/i, "")
      .trim() || "MJK Investment";

    // -----------------------------
    // IMAGE
    // -----------------------------
    const imgSrc = card.find(".author-img-wrapper img").attr("src");
    const image = imgSrc ? new URL(imgSrc, url).toString() : null;

    posts.push({
      title,
      link: absoluteLink,
      published,
      author,
      image,
    });
  });

  console.log(`✅ Latest posts extracted: ${posts.length}`);
  return posts;
}
