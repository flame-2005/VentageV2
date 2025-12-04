"use node"

import { IncomingPost } from "../../../constant/posts";

export async function fetchSubstackRSS(substackUrl: string): Promise<IncomingPost[] | null> {
  try {
    const rssFeedUrl =
      substackUrl.endsWith("/feed")
        ? `${substackUrl}`
        : `${substackUrl}/feed`;

    console.log(`📡 Fetching RSS feed: ${rssFeedUrl}`);

    const response = await fetch(rssFeedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SubstackRSSFetcher/1.0)",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error("❌ RSS fetch failed:", response.status);
      return null;
    }

    const xml = await response.text();

    // Helper to extract tag content
    const extract = (block: string, tag: string): string | null => {
      const reg = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
      const match = block.match(reg);
      return match ? match[1].trim() : null;
    };

    const items: IncomingPost[] = [];

    const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of matches) {
      const item = match[1];

      const title = extract(item, "title") ?? "";
      const link = extract(item, "link") ?? "";
      const pubDate = extract(item, "pubDate") ?? "";
      const description = extract(item, "description") ?? "";
      const author = extract(item, "dc:creator") ?? undefined;

      items.push({
        title,
        link,
        published: pubDate,
        author,
        image: undefined, // RSS usually doesn't include image
        source: substackUrl,
      });
    }

    console.log(`✅ Parsed ${items.length} Substack posts`);
    return items;
  } catch (err) {
    console.error("❌ Error fetching Substack RSS:", err);
    return null;
  }
}