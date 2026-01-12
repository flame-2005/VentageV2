"use node";

import * as cheerio from "cheerio";
import { ScrapedPost } from "../scraper/types";
import { extractImageSmart } from "../../../../helper/addImage";
import { extractAuthorSmart } from "../images/extractAuthorSmart";

export async function scrapePerpetuityBlog(
  url: string
): Promise<ScrapedPost[]> {
  console.log(`🔎 Scraping Perpetuity blog (latest only): ${url}`);

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

  /**
   * This selector already exists in initial HTML
   * (before clicking "Show More")
   */
  const cards = $('a[data-ux="Link"]').toArray();

  for (const el of cards) {
    const card = $(el);

    const link = card.attr("href");
    const title = card.find("h4").first().text().trim();
    const published = card
      .find('[data-aid="RSS_FEED_POST_DATE_RENDERED"]')
      .first()
      .text()
      .trim();

    if (!link || !title) continue;

    const absoluteLink = link.startsWith("http")
      ? link
      : new URL(link, url).toString();

    if (seen.has(absoluteLink)) continue;
    seen.add(absoluteLink);

    // 🖼️ Image + ✍️ Author (enriched per post)
    const [image, author] = await Promise.all([
      extractImageSmart({ title, link: absoluteLink }),
      extractAuthorSmart({ link: absoluteLink }),
    ]);

    posts.push({
      title,
      link: absoluteLink,
      published,
      author: author || "Perpetuity",
      image,
    });
  }

  console.log(`✅ Latest posts scraped: ${posts.length}`);
  return posts;
}
