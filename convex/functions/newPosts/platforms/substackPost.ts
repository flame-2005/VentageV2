"use node";

import { IncomingPost } from "../../../constant/posts";
import { XMLParser } from "fast-xml-parser";

export async function fetchSubstackRSS(
  substackUrl: string
): Promise<IncomingPost[] | null> {
  try {
    const rssFeedUrl = substackUrl;

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

    // ✅ Proper XML parser (namespace + CDATA safe)
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      removeNSPrefix: true, // dc:creator → creator
      parseTagValue: true,
      trimValues: true,
    });

    const parsed = parser.parse(xml);

    const rawItems =
      parsed?.rss?.channel?.item ||
      parsed?.feed?.entry ||
      [];

    const itemsArray = Array.isArray(rawItems)
      ? rawItems
      : [rawItems];

    const posts: IncomingPost[] = [];

    for (const item of itemsArray) {
      const title =
        item.title?.["#text"] ||
        item.title ||
        "Untitled";

      const link =
        typeof item.link === "string"
          ? item.link
          : item.link?.href || "";

      const published =
        item.pubDate ||
        item.published ||
        "";

      const author =
        item.creator ||
        item.author?.name ||
        undefined;

      // Image priority:
      // 1. enclosure
      // 2. first <img> from content
      let image: string | undefined;

      if (item.enclosure?.url) {
        image = item.enclosure.url;
      } else if (item["content:encoded"] || item.content) {
        const html =
          item["content:encoded"] ||
          item.content ||
          "";
        const imgMatch = html.match(
          /<img[^>]+src=["']([^"']+)["']/i
        );
        image = imgMatch?.[1];
      }

      posts.push({
        title,
        link,
        published,
        author,
        image,
        source: "substack",
      });
    }

    console.log(`✅ Parsed ${posts.length} Substack posts`);
    return posts;
  } catch (err) {
    console.error("❌ Error fetching Substack RSS:", err);
    return null;
  }
}
