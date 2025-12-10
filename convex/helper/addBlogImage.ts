"use node";

import { action } from "../_generated/server";
import Parser from "rss-parser";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { tryParseFeed } from "./feedParser";
import { fetchHtml } from "../functions/newPosts/platforms/blogsiteFetchers/fetchHTML";
import { aiExtractImage } from "./agents/extractImage";
import { normalizeUrl } from "./blogs";

interface Blog {
  _id: Id<"blogs">;
  feedUrl: string;
  imageUrl?: string;
}

export function extractOgImage(html: string): string | null {
  const match = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  );
  return match ? match[1] : null;
}

export async function extractBlogImage(blog: Blog): Promise<string | null> {
  const parser = new Parser();

  if (!blog.feedUrl) return null;

  const baseUrl = normalizeUrl(blog.feedUrl);

  try {
    // 1️⃣ Try RSS feed
    const feed = await tryParseFeed(parser, baseUrl);

    if (!feed) {
      console.log("No valid RSS feed found for:", blog.feedUrl);

      // 2️⃣ Try HTML fallback
      const html = await fetchHtml(baseUrl);
      if (!html) return null;

      // 3️⃣ Try OG image
      const ogImage = extractOgImage(html);
      if (ogImage) return ogImage;

      // 4️⃣ Try AI extraction
      const aiImage = await aiExtractImage(html, baseUrl);
      if (aiImage) return aiImage;

      return null;
    }

    // 5️⃣ Extract from RSS feed
    const feedRecord = feed as unknown as Record<string, unknown>;
    const mediaThumbnail = feedRecord["media:thumbnail"] as
      | { url?: string }
      | undefined;

    const feedImage =
      feed.image?.url ||
      feed.image?.link ||
      mediaThumbnail?.url ||
      null;

    return feedImage ?? null;
  } catch (err) {
    console.log("Image extraction failed:", blog.feedUrl, err);
    return null;
  }
}
