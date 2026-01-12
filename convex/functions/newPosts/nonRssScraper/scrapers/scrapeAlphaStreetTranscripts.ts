"use node";

import * as cheerio from "cheerio";

export interface ScrapedPost {
  title: string;
  link: string;
  published: string;
  author: string;
  excerpt: string;
  image: string | null;
}

export async function scrapeAlphaStreetLatest(
  url: string,
  limit = 20
): Promise<ScrapedPost[]> {
  console.log(`🚀 Fetching latest AlphaStreet posts`);
  console.log(`🌐 URL: ${url}`);

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

  $("article.finance-card").each((_, el) => {
    if (posts.length >= limit) return;

    const card = $(el);

    const titleEl = card.find("h2 a").first();
    const title = titleEl.text().trim();
    const link = titleEl.attr("href");

    if (!title || !link) return;

    const absoluteLink = new URL(link, url).toString();
    if (seen.has(absoluteLink)) return;
    seen.add(absoluteLink);

    const published = card
      .find(".text-muted span")
      .first()
      .text()
      .replace("●", "")
      .trim();

    const excerpt = card.find(".excerpt").text().trim();
    const image = card.find("img.wp-post-image").attr("src") || null;

    posts.push({
      title,
      link: absoluteLink,
      published,
      author: "AlphaStreet",
      excerpt,
      image,
    });
  });

  console.log(`✅ Latest posts scraped: ${posts.length}`);
  return posts;
}
