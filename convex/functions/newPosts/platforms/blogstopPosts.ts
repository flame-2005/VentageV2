"use node"

import Parser from "rss-parser";
import { IncomingPost } from "../../../constant/posts";

interface BlogspotFeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  categories?: string[];
  creator?: string;
  author?: { name?: string } | string;
  enclosure?: { url?: string };
  "media:thumbnail"?: { $?: { url?: string } };
}

export async function fetchBlogspotRSS(
  blogUrl: string,
  maxPerBatch: number = 50
): Promise<IncomingPost[] | null> {
  try {
    const normalized = blogUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const feedBaseUrl = `https://${normalized}/feeds/posts/default`;

    const parser = new Parser({
      customFields: {
        item: [
          ["content:encoded", "content"],
          ["dc:creator", "creator"],
          ["media:thumbnail", "media:thumbnail"],
          ["author", "author"],
        ],
      },
    });

    const allPosts: IncomingPost[] = [];
    let startIndex = 1;
    let batch = 1;

    while (true) {
      const url = `${feedBaseUrl}?start-index=${startIndex}&max-results=${maxPerBatch}&orderby=published`;

      console.log(`📡 Blogspot Fetch: Batch ${batch} → ${url}`);

      const feed = await parser.parseURL(url);

      if (!feed.items || feed.items.length === 0) {
        console.log("✓ No more Blogspot posts.");
        break;
      }

      const converted = parseBlogspotItems(feed.items, `https://${normalized}`);
      allPosts.push(...converted);

      console.log(`✓ Batch ${batch}: ${converted.length} posts`);

      if (feed.items.length < maxPerBatch) break;

      startIndex += maxPerBatch;
      batch++;

      await new Promise((r) => setTimeout(r, 800));
    }

    return allPosts;
  } catch (err) {
    console.error("❌ Blogspot RSS Fetch Error:", err);
    return null;
  }
}

function parseBlogspotItems(
  items: BlogspotFeedItem[],
  source: string
): IncomingPost[] {
  const posts: IncomingPost[] = [];

  for (const item of items) {
    // Extract image
    let imageUrl: string | undefined;

    if (item["media:thumbnail"]?.$?.url) {
      imageUrl = item["media:thumbnail"]!.$!.url;
    } else if (item.enclosure?.url) {
      imageUrl = item.enclosure.url;
    }

    // Extract author
    let author: string | undefined;

    if (typeof item.author === "string") {
      author = item.author;
    } else if (item.author && typeof item.author === "object" && item.author.name) {
      author = item.author.name;
    } else if (item.creator) {
      author = item.creator;
    }

    posts.push({
      title: item.title || "",
      link: item.link || "",
      published: item.pubDate || "",
      author,
      image: imageUrl,
      content: item.content || item.contentSnippet || "",
      source,
    });
  }

  return posts;
}
