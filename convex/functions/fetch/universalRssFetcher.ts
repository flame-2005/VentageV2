"use node";

import Parser from "rss-parser";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

// --------------------------------------------------------------
// TYPES
// --------------------------------------------------------------

interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

export interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;

  enclosure?: { url?: string };

  "dc:creator"?: string;
  creator?: string;
  author?: string;
  "itunes:author"?: string;
  "meta:author"?: string;
  "article:author"?: string;
  "atom:author"?: string;

  "media:content"?: { url?: string };
  "media:thumbnail"?: { url?: string };
  "media:group"?: { "media:content"?: { url?: string } };

  featuredImage?: string;
  image?: string;
  "post-thumbnail"?: string;

  content?: string;
  summary?: string;
  categories?: string[];
}

export interface UnifiedPost {
  title: string;
  link: string;
  published: string;
  author: string;
  image: string | null;
}

// --------------------------------------------------------------
// AUTHOR + IMAGE EXTRACTION HELPERS
// --------------------------------------------------------------

export function extractAuthor(item: RSSItem): string | null {
  const fields: (keyof RSSItem)[] = [
    "dc:creator",
    "creator",
    "author",
    "itunes:author",
    "meta:author",
    "article:author",
    "atom:author",
  ];

  for (const field of fields) {
    const value = item[field];
    if (typeof value === "string" && value.trim().length > 0) {
      console.log(`📝 Author extracted from "${field}":`, value);
      return value.trim();
    }
  }

  console.log("⚠️ No author field found in RSS item.");
  return null;
}

export function extractImage(item: RSSItem): string | null {
  // 1️⃣ Extract from known RSS media fields
  const possibleImages: (string | undefined)[] = [
    item.enclosure?.url,
    item["media:content"]?.url,
    item["media:thumbnail"]?.url,
    item["media:group"]?.["media:content"]?.url,
    item["post-thumbnail"],
    item.featuredImage,
    item.image,
  ];

  for (const img of possibleImages) {
    if (typeof img === "string" && img.trim().length > 0) {
      console.log("🖼️ Image detected from RSS fields:", img);
      return img.trim();
    }
  }

  // 2️⃣ Extract from <content:encoded> HTML
  if (item.content) {
    const img = extractImageFromHTML(item.content);
    if (img) {
      console.log("🖼️ Image extracted from <content:encoded>:", img);
      return img;
    }
  }

  // 3️⃣ Extract from <description> HTML
  if (item.summary) {
    const img = extractImageFromHTML(item.summary);
    if (img) {
      console.log("🖼️ Image extracted from <description>:", img);
      return img;
    }
  }

  console.log("⚠️ No image found in RSS item or embedded HTML");
  return null;
}

function extractImageFromHTML(html: string): string | null {
  try {
    const $ = cheerio.load(html);

    // 1. First img in content
    const img = $("img").attr("src");
    if (img) return img;

    // 2. og:image meta tag inside content HTML (rare but possible)
    const og = $('meta[property="og:image"]').attr("content");
    if (og) return og;

    return null;
  } catch {
    return null;
  }
}

async function fetchSitemapUrls(
  sitemapUrl: string
): Promise<{ sitemaps: string[]; posts: SitemapUrl[] }> {
  console.log(`🗺️ Fetching sitemap: ${sitemapUrl}`);

  try {
    const res = await fetch(sitemapUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      console.log("❌ Failed to fetch sitemap:", res.status);
      return { sitemaps: [], posts: [] };
    }

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const sitemaps: string[] = [];
    const posts: SitemapUrl[] = [];

    // Extract child sitemaps
    $("sitemap > loc, sitemap loc").each((_, el) => {
      sitemaps.push($(el).text().trim());
    });

    // Extract post URLs with lastmod dates
    $("url").each((_, el) => {
      const loc = $(el).find("loc").text().trim();
      const lastmod = $(el).find("lastmod").text().trim();

      // ✅ ONLY keep actual posts (must contain /p/)
      if (loc.includes("/p/")) {
        posts.push({
          loc,
          lastmod: lastmod || undefined,
        });
      }
    });

    console.log(
      `📦 Sitemap extracted ${sitemaps.length} child sitemaps, ${posts.length} posts`
    );
    return { sitemaps, posts };
  } catch (err) {
    console.log("❌ Error fetching sitemap:", err);
    return { sitemaps: [], posts: [] };
  }
}

async function fetchSubstackPost(url: string): Promise<UnifiedPost | null> {
  try {
    console.log(`📄 Fetching Substack post: ${url}`);

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text().trim();

    // Try multiple selectors for published date
    const published =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="article:published_time"]').attr("content") ||
      $("time").attr("datetime") ||
      $("time[datetime]").first().attr("datetime") ||
      $(".pencraft time").attr("datetime") ||
      $('[class*="post-date"] time').attr("datetime") ||
      $('[class*="date"] time').attr("datetime") ||
      "";

    const author =
      $('meta[name="author"]').attr("content") ||
      $('a[rel="author"]').text().trim() ||
      $('.pencraft [class*="author"]').first().text().trim() ||
      "Unknown";

    const image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;

    return {
      title: title || "Untitled",
      link: url,
      published,
      author,
      image,
    };
  } catch (err) {
    console.log("❌ Error fetching Substack post:", err);
    return null;
  }
}

async function fetchSubstackFromSitemap(base: string): Promise<UnifiedPost[]> {
  console.log("🚀 Starting Substack sitemap ingestion");

  const master = `${base}/sitemap.xml`;
  const postUrls = new Map<string, string>(); // url -> lastmod

  // Fetch the master sitemap
  const { sitemaps, posts } = await fetchSitemapUrls(master);

  // Add posts from master sitemap with their lastmod dates
  posts.forEach((p) => postUrls.set(p.loc, p.lastmod || ""));

  console.log(`🧾 Total Substack post URLs: ${postUrls.size}`);

  const results: UnifiedPost[] = [];

  for (const [url, lastmod] of postUrls) {
    const post = await fetchSubstackPost(url);
    if (post) {
      // Use lastmod from sitemap if post.published is empty
      if (!post.published && lastmod) {
        post.published = lastmod;
      }
      results.push(post);
    }
  }

  console.log(`✅ Substack posts fetched: ${results.length}`);
  return results;
}

export async function extractImageSmart(item: RSSItem): Promise<string | null> {
  // 1️⃣ Try RSS media fields first
  const rssImg = extractImage(item);
  if (rssImg) return rssImg;

  // 2️⃣ If RSS has no images → fetch article page
  if (!item.link) return null;

  try {
    console.log(`🌐 Fetching article to extract image: ${item.link}`);

    const res = await fetch(item.link, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      console.log("❌ Failed to load article:", res.status);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // 2a. Try OG Image
    const og = $('meta[property="og:image"]').attr("content");
    if (og) {
      console.log("🖼️ Extracted og:image:", og);
      return og;
    }

    // 2b. Try Twitter image
    const tw = $('meta[name="twitter:image"]').attr("content");
    if (tw) {
      console.log("🖼️ Extracted twitter:image:", tw);
      return tw;
    }

    // 2c. First article <img>
    const firstImg =
      $("article img").first().attr("src") || $("img").first().attr("src");
    if (firstImg) {
      console.log("🖼️ Extracted inline <img>:", firstImg);
      return firstImg;
    }
  } catch (err) {
    console.log("❌ Error fetching article HTML:", err);
  }

  console.log("⚠️ No image found even after HTML fallback:", item.link);
  return null;
}

// --------------------------------------------------------------
// RSS Parser
// --------------------------------------------------------------

const parser = new Parser({
  customFields: {
    item: [
      ["content:encoded", "content"],
      ["dc:creator", "dc:creator"],
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
      ["media:group", "media:group"],
      ["itunes:author", "itunes:author"],
      ["meta:author", "meta:author"],
      ["article:author", "article:author"],
      ["atom:author", "atom:author"],
      ["post-thumbnail", "post-thumbnail"],
    ],
  },
});

// --------------------------------------------------------------
// Fetch RSS
// --------------------------------------------------------------

async function fetchRSS(url: string) {
  console.log(`\n📡 Attempting RSS fetch: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        Accept:
          "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: AbortSignal.timeout(15000),
    });

    console.log(`🔍 Status: ${response.status}`);

    if (response.status === 403 || response.status === 503) {
      console.log("⛔ Cloudflare/Anti-bot blocked this RSS URL.");
      return null;
    }

    const text = await response.text();

    if (!text.includes("<rss") && !text.includes("<feed")) {
      console.log("⚠️ Response is not valid RSS/Atom XML.");
      return null;
    }

    const parsed = await parser.parseString(text);
    console.log(`✅ Parsed ${parsed.items.length} RSS items from ${url}`);

    return parsed;
  } catch (err) {
    console.log(`❌ Error fetching RSS from ${url}:`, err);
    return null;
  }
}

// --------------------------------------------------------------
// WordPress: /feed/?paged=N
// --------------------------------------------------------------

async function fetchWordPressHistorical(feed: string): Promise<RSSItem[]> {
  console.log(`\n🔄 Starting WordPress pagination for ${feed}`);
  const items: RSSItem[] = [];
  let page = 1;

  while (true) {
    const url = `${feed}?paged=${page}`;
    console.log(`➡️ Fetching WordPress page: ${url}`);

    const data = await fetchRSS(url);

    if (!data || data.items.length === 0) {
      console.log(`⛔ Page ${page} returned 0 items -> stopping.`);
      break;
    }

    console.log(`📦 Page ${page} returned ${data.items.length} items`);
    items.push(...data.items);

    if (data.items.length < 5) {
      console.log("🛑 Less than 5 items -> likely end of feed.");
      break;
    }

    page++;
  }

  console.log(`✨ Total WordPress paginated items: ${items.length}`);
  return items;
}

// --------------------------------------------------------------
// Blogger: start-index pagination
// --------------------------------------------------------------

async function fetchBloggerHistorical(blogUrl: string): Promise<RSSItem[]> {
  console.log(`\n🔄 Starting Blogger pagination for ${blogUrl}`);

  const items: RSSItem[] = [];
  let start = 1;
  const max = 500;

  while (true) {
    const url = `${blogUrl}/feeds/posts/default?start-index=${start}&max-results=${max}`;
    console.log(`➡️ Fetching Blogger batch: ${url}`);

    const feed = await fetchRSS(url);

    if (!feed || feed.items.length === 0) {
      console.log("⛔ No more Blogger posts.");
      break;
    }

    console.log(`📦 Batch returned ${feed.items.length} posts`);
    items.push(...feed.items);

    if (feed.items.length < max) {
      console.log("🛑 Last batch received → stopping.");
      break;
    }

    start += max;
  }

  console.log(`✨ Total Blogger historical items: ${items.length}`);
  return items;
}

// --------------------------------------------------------------
// HTML Archive & Pagination Fallback
// --------------------------------------------------------------

async function crawlArchives(base: string): Promise<string[]> {
  console.log(`\n🔎 Crawling archive pages for: ${base}`);

  const urls = new Set<string>();
  const archivePages = ["/archive", "/archives", "/posts"];

  for (const path of archivePages) {
    const full = base + path;
    console.log(`➡️ Trying archive URL: ${full}`);

    try {
      const res = await fetch(full);

      if (!res.ok) {
        console.log(`⚠️ Archive page ${full} returned ${res.status}`);
        continue;
      }

      console.log(`✅ Archive page found: ${full}`);

      const html = await res.text();
      const $ = cheerio.load(html);

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        const link = new URL(href, base).href;
        if (link.includes(base)) urls.add(link);
      });

      console.log(`📦 Extracted ${urls.size} total article links so far`);
    } catch (err) {
      console.log(`❌ Error fetching archive page ${full}:`, err);
    }
  }

  return [...urls];
}

// --------------------------------------------------------------
// Normalize
// --------------------------------------------------------------

async function normalize(
  items: RSSItem[],
  source: string
): Promise<UnifiedPost[]> {
  const results: UnifiedPost[] = [];

  for (const item of items) {
    const author = extractAuthor(item) || "Unknown";
    const image = await extractImageSmart(item);

    results.push({
      title: item.title || "Untitled",
      link: item.link || "",
      published: item.isoDate || item.pubDate || "",
      author,
      image,
    });
  }

  return results;
}

// --------------------------------------------------------------
// MAIN UNIVERSAL FUNCTION
// --------------------------------------------------------------

export async function fetchHistoricalFromRSS(url: string) {
  console.log("\n====================================================");
  console.log(`🌐 Starting universal fetch for: ${url}`);
  console.log("====================================================\n");

  const clean = url.replace(/\/$/, "");

  // ✅ Substack detection
  if (clean.includes("substack.com") || clean.includes("thedailybrief")) {
    console.log("📌 Detected Substack — switching to sitemap ingestion");
    return await fetchSubstackFromSitemap(clean);
  }

  // ⬇️ EXISTING LOGIC UNCHANGED ⬇️
  const all: RSSItem[] = [];
  let validFeedFound = false;

  const feedCandidates = [
    `${clean}/feed/`,
    `${clean}/rss`,
    `${clean}/atom.xml`,
    `${clean}/feeds/posts/default`,
  ];

  for (const feed of feedCandidates) {
    const data = await fetchRSS(feed);

    if (data && data.items.length > 0) {
      all.push(...data.items);
      validFeedFound = true;

      if (feed.includes("/feed/")) {
        const items = await fetchWordPressHistorical(feed);
        all.push(...items);
      }

      if (clean.includes("blogspot")) {
        const items = await fetchBloggerHistorical(clean);
        all.push(...items);
      }

      break;
    }
  }

  if (!validFeedFound || all.length < 20) {
    const archiveLinks = await crawlArchives(clean);
    for (const link of archiveLinks) {
      const data = await fetchRSS(link);
      if (data) all.push(...data.items);
    }
  }

  const map = new Map<string, RSSItem>();
  for (const item of all) {
    if (item.link) map.set(item.link, item);
  }

  return await normalize([...map.values()], clean);
}
