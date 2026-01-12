"use node";

import * as cheerio from "cheerio";
import { ScrapedPost } from "../scraper/types";
import { extractImageSmart } from "../../../../helper/addImage";
import { extractAuthorSmart } from "../images/extractAuthorSmart";

export async function scrapeSurgeCapitalKnowledgeBase(
  url: string
): Promise<ScrapedPost[]> {
  console.log(`🚀 Fetching Surge Capital Knowledge Base`);
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

  const itemSelector =
    "div.post-list-item-wrapper, div.blog-post-post-list-overlay-background-color";

  const posts: ScrapedPost[] = [];
  const seen = new Set<string>();

  $(itemSelector).each((_, el) => {
    const card = $(el);

    const linkEl = card.find("a[href*='/post/']").first();
    const title = card.find("h2").first().text().trim();
    const published = card.find(".post-metadata__date").first().text().trim();
    const link = linkEl.attr("href");

    if (!title || !link) return;

    const absoluteLink = link.startsWith("http")
      ? link
      : new URL(link, url).toString();

    if (seen.has(absoluteLink)) return;
    seen.add(absoluteLink);

    posts.push({
      title,
      link: absoluteLink,
      published,
      author: "",
      image: null,
    });
  });

  console.log(`🧾 Latest posts found: ${posts.length}`);

  // -----------------------
  // 🖼️ IMAGE + 👤 AUTHOR ENRICH
  // -----------------------
  const enriched: ScrapedPost[] = [];

  for (const post of posts) {
    const [image, author] = await Promise.all([
      extractImageSmart({
        title: post.title,
        link: post.link,
      }),
      extractAuthorSmart({
        link: post.link,
      }),
    ]);

    enriched.push({
      ...post,
      image,
      author: author || "Surge Capital",
    });
  }

  console.log(`✅ Surge Capital scrape complete`);
  return enriched;
}
