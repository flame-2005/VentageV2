"use node";

import axios from "axios";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { extractBlogImage } from "./addBlogImage";
import { Id } from "../_generated/dataModel";
import { Blog } from "../constant/blogs";

const parser = new Parser();

// ---- FEED DETECTION CONFIG ----
const POSSIBLE_RSS_PATHS = [
  "/feed/",
  "/rss",
  "/rss.xml",
  "/atom.xml",
  "/blog/feed/",
  "/articles/feed/",
  "/insights/feed/",
  "/posts/feed/",
];

const POSSIBLE_BLOG_PATHS = [
  "/blog",
  "/blogs",
  "/articles",
  "/insights",
  "/posts",
  "/news",
  "/investmentshastra",
];

// ---- HELPERS ----
async function tryURL(url: string) {
  try {
    const res = await axios.get(url, { timeout: 8000 });
    return res.data;
  } catch {
    return null;
  }
}

async function tryRSS(url: string) {
  try {
    await parser.parseURL(url);
    return true;
  } catch {
    return false;
  }
}

function detectPlatform(html: string) {
  if (!html) return "custom";
  if (html.includes("wp-content") || html.includes("WordPress"))
    return "wordpress";
  if (html.includes("substack.com")) return "substack";
  if (html.includes('content="Ghost"')) return "ghost";
  if (html.includes("medium.com")) return "medium";
  return "custom";
}

// ---- MAIN DETECTION FUNCTION ----
async function detectFeedForBlog(domain: string) {
  if (!domain.startsWith("http")) domain = "https://" + domain;

  // 1️⃣ Try all possible RSS feeds
  for (const path of POSSIBLE_RSS_PATHS) {
    const feedUrl = domain.replace(/\/$/, "") + path;
    const ok = await tryRSS(feedUrl);
    if (ok) {
      return { status: "rss", feedUrl };
    }
  }

  // 2️⃣ Detect platform
  const homepage = await tryURL(domain);
  const platform = detectPlatform(homepage);

  if (platform === "substack") {
    const feedUrl = domain + "/feed";
    return { status: "rss", feedUrl };
  }

  if (platform === "medium") {
    const feedUrl = domain + "/feed";
    return { status: "rss", feedUrl };
  }

  if (platform === "ghost") {
    const feedUrl = domain + "/rss/";
    return { status: "rss", feedUrl };
  }

  // 3️⃣ Try HTML blog pages
  for (const path of POSSIBLE_BLOG_PATHS) {
    const pageUrl = domain.replace(/\/$/, "") + path;
    const html = await tryURL(pageUrl);

    if (!html) continue;

    const $ = cheerio.load(html);
    const hasPosts =
      $("article").length ||
      $(".post").length ||
      $(".blog-post").length ||
      $("h2 a").length > 3;

    if (hasPosts) {
      return { status: "html", blogUrl: pageUrl };
    }
  }

  // 4️⃣ Nothing found
  return { status: "none" };
}

// -----------------------------------------------------------
// 🚀 FINAL CONVEX-ENABLED SCRIPT
// -----------------------------------------------------------
export async function classifyBlogs(blogs: Blog[]) {
  console.log("Classifying blogs…");

  const updates: {
    id: Id<"blogs">;
    extractionMethod: string;
    feedUrl: string;
    imageUrl: string;
  }[] = [];

  for (const blog of blogs) {
    console.log(`\n🔍 Checking: ${blog.domain}`);

    let extractionMethod = "AI";
    let finalFeedUrl = blog.feedUrl ?? "";

    // ✅ SUBSTACK OVERRIDE (must come first)
    if (blog.domain.includes("substack.com")) {
      extractionMethod = "RSS";
      finalFeedUrl = `https://${blog.domain}/feed`;

      console.log("✅ SUBSTACK RSS →", finalFeedUrl);
    } else {
      // Detect feed normally
      const result = await detectFeedForBlog(blog.domain);

      if (result.status === "rss") {
        extractionMethod = "RSS";
        finalFeedUrl = result.feedUrl!;

        console.log("✅ RSS FOUND →", finalFeedUrl);
      } else {
        console.log("⚠️ No RSS found → Using AI");
      }
    }

    // ⭐ Extract image URL
    const imageUrl = await extractBlogImage({
      ...blog,
      feedUrl: finalFeedUrl,
    });

    updates.push({
      id: blog._id,
      extractionMethod,
      feedUrl: finalFeedUrl,
      imageUrl: imageUrl ?? "",
    });
  }

  console.log("🎉 DONE Classifying Blogs!");

  return { updated: updates.length, updates };
}
