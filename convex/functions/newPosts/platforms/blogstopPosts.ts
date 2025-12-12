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
  maxResults: number = 500
): Promise<IncomingPost[] | null> {
  try {
    // Remove protocol and trailing slash
    let normalized = blogUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    
    // Remove /feed or /feeds/posts/default if present
    normalized = normalized.replace(/\/feeds?.*$/, "");

    const feedUrl = blogUrl;

    console.log(`📡 Fetching Blogspot feed: ${feedUrl}`);

    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: `https://${normalized}/`,
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();

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

    const feed = await parser.parseString(xmlText);

    if (!feed.items || feed.items.length === 0) {
      console.log("⚠️ No posts found in feed");
      return [];
    }

    const posts = parseBlogspotItems(feed.items, `https://${normalized}`);
    console.log(`✓ Fetched ${posts.length} posts from Blogspot`);

    return posts;
  } catch (err) {
    console.error("❌ Blogspot RSS Fetch Error:", err);
    
    if (err instanceof Error) {
      if (err.message.includes('404')) {
        console.error(`   Feed URL doesn't exist. Check: ${blogUrl}`);
      } else if (err.message.includes('403')) {
        console.error(`   Access forbidden. Blog might be private.`);
      } else if (err.name === 'AbortError') {
        console.error(`   Request timed out after 15 seconds`);
      }
    }
    
    return null;
  }
}

function parseBlogspotItems(
  items: BlogspotFeedItem[],
  source: string
): IncomingPost[] {
  const posts: IncomingPost[] = [];

  for (const item of items) {
    let imageUrl: string | undefined;

    if (item["media:thumbnail"]?.$?.url) {
      imageUrl = item["media:thumbnail"]!.$!.url;
    } else if (item.enclosure?.url) {
      imageUrl = item.enclosure.url;
    }

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
      source: 'blogspot',
    });
  }

  return posts;
}