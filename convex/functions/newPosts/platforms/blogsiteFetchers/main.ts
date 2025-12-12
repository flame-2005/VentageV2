"use node";

import { Blog } from "../../../../constant/blogs";
import { IncomingPost } from "../../../../constant/posts";
import { extractPostsFromHTML_AI } from "./extractPostsFromHTML";
import { extractRSSLinks } from "./extractRss";
import { fetchHtml } from "./fetchHTML";
import { getPostsFromRSS } from "./getPostsFromRss";
import { crawlHistoricalPosts } from "./paginatedCrawler";

export async function getAllPosts(blog: Blog) {
  // Use domain as the base URL
  const baseUrl = blog.domain.startsWith("http")
    ? blog.domain
    : `https://${blog.domain}`;

  console.log(`\n📌 Extracting posts for: ${blog.name} (${baseUrl})`);
  console.log("Extraction method:", blog.extractionMethod);

  const posts: IncomingPost[] = [];

  // ---------------------------------------------------------
  // 1️⃣ USE RSS IF CLASSIFIED AS RSS
  // ---------------------------------------------------------
  if (blog.extractionMethod === "RSS" && blog.feedUrl) {
    try {
      console.log("➡️ Attempting RSS extraction:", blog.feedUrl);
      const rssPosts = await getPostsFromRSS(blog.feedUrl);

      if (rssPosts.length > 0) {
        posts.push(...rssPosts);
      }
    } catch (err) {
      console.error("❌ RSS failed:", err);
    }
  }

  // ---------------------------------------------------------
  // 2️⃣ AI EXTRACTION (IF RSS NOT USED OR EMPTY)
  // ---------------------------------------------------------
  if (posts.length === 0) {
    console.log("🤖 Using AI extraction...");
    const html = await fetchHtml(baseUrl);

    if (html) {
      const homepagePosts = await extractPostsFromHTML_AI(html, baseUrl);
      posts.push(...homepagePosts);
    } else {
      console.log("❌ Failed to fetch HTML for:", baseUrl);
    }
  }

  // ---------------------------------------------------------
  // 3️⃣ HISTORICAL POSTS CRAWLING (DEEP LINKS)
  // ---------------------------------------------------------
  // console.log("📚 Crawling historical posts...");
  // const historical = await crawlHistoricalPosts(baseUrl);

  // posts.push(...historical);

  console.log(`✅ Total posts extracted: ${posts.length}`);
  return posts;
}
