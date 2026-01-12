"use node";

import { IncomingPost } from "../../../../constant/posts";
import { SCRAPERS } from "./index";
import { ScrapedPost } from "./types";

export async function scrapeBlog(url: string): Promise<IncomingPost[]> {
  try {
    console.log(`🔎 Scraping blog: ${url}`);

    // 1️⃣ Fetch HTML ONCE
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch URL: ${res.status}`);
    }

    for (const scraper of SCRAPERS) {
      try {
        if (scraper.canHandle && !scraper.canHandle(url)) continue;

        console.log(`🧪 Trying scraper: ${scraper.name}`);

        const posts = await scraper.scrape(url);

        if (posts && posts.length > 0) {
          const enrichedPosts = posts.map((post) => ({
            ...post,
            source: "others",
          }));

          console.log(
            `✅ ${scraper.name} extracted ${enrichedPosts.length} posts`
          );
          return enrichedPosts;
        }

        console.log(`⚠️ ${scraper.name} returned no posts`);
      } catch (err) {
        console.log(
          `❌ ${scraper.name} failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    throw new Error("No scraper could extract posts from this URL");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to scrape ${url}: ${errorMessage}`);

    return [];
  }
}
