"use node";

import Parser from "rss-parser";
import { IncomingPost } from "../../../constant/posts";

interface WPFeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  categories?: string[];
  mediaContent?: Array<{ $?: { url?: string } }>;
}

export async function fetchWordPressRSS(
  blogUrl: string,
  maxPages: number = 1
): Promise<IncomingPost[] | null> {
  try {
    const baseUrl = blogUrl.replace(/\/$/, "");
    const parser = new Parser({
      customFields: {
        item: [
          ["content:encoded", "content"],
          ["dc:creator", "creator"],
          ["media:content", "mediaContent", { keepArray: true }],
        ],
      },
    });

    const allPosts: IncomingPost[] = [];

    const baseFeedUrl = baseUrl.includes("/feed") ? baseUrl : `${baseUrl}/feed`;

    for (let page = 1; page <= maxPages; page++) {
      const feedUrl =
        page === 1 ? `${baseFeedUrl}/` : `${baseFeedUrl}/?paged=${page}`;

      console.log(`📡 Fetching: ${feedUrl}`);

      const feed = await parser.parseURL(feedUrl);
      if (!feed.items || feed.items.length === 0) break;

      const pagePosts = parseWPItems(feed.items, baseUrl);
      allPosts.push(...pagePosts);

      console.log(`✓ Page ${page}: ${pagePosts.length} posts`);

      // Stop early if the page has too few posts
      if (pagePosts.length < 5) break;

      await new Promise((res) => setTimeout(res, 500));
    }

    return allPosts;
  } catch (err) {
    console.error("❌ WordPress RSS Fetch Error:", err);
    return null;
  }
}

/**
 * Convert WordPress RSS Items → IncomingPost[]
 */
function parseWPItems(items: WPFeedItem[], sourceUrl: string): IncomingPost[] {
  const posts: IncomingPost[] = [];

  for (const item of items) {
    let imageUrl: string | undefined = undefined;

    // Extract first valid media:content image
    if (item.mediaContent) {
      for (const media of item.mediaContent) {
        const url = media?.$?.url;
        if (url && !url.includes("gravatar.com")) {
          imageUrl = url;
          break;
        }
      }
    }

    posts.push({
      title: item.title || "",
      link: item.link || "",
      published: item.pubDate || "",
      author: item.creator,
      image: imageUrl,
      content: item.content || item.contentSnippet || "",
      source: sourceUrl,
    });
  }

  return posts;
}
