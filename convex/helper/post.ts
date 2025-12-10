import { action, mutation, query } from "../_generated/server";
import Papa from "papaparse";
import { hasCompanyData } from "./blogs";
import { api } from "../_generated/api";
import { IncomingPost, RSSItem } from "../constant/posts";


// 2️⃣ Generate CSV for both
export const exportCsv = action({
  handler: async (ctx) => {
    // MUST pass an empty args object {}
    const { matched, notMatched } = await ctx.runQuery(
      api.functions.substackBlogs.splitPosts,
      {}
    );

    const matchedCsv = Papa.unparse(matched);
    const notMatchedCsv = Papa.unparse(notMatched);

    // storeBlob returns a BlobId, not URL
    const matchedBlobId = await ctx.storage.store(
      new Blob([matchedCsv], { type: "text/csv" })
    );

    const notMatchedBlobId = await ctx.storage.store(
      new Blob([notMatchedCsv], { type: "text/csv" })
    );

    return {
      matchedCsvUrl: await ctx.storage.getUrl(matchedBlobId),
      notMatchedCsvUrl: await ctx.storage.getUrl(notMatchedBlobId),
    };
  },
});

export function convertRssDateToIso(dateString: string): string {
  try {
    const date = new Date(dateString);

    // Check for invalid date
    if (isNaN(date.getTime())) {
      return new Date().toISOString(); // fallback
    }

    return date.toISOString();
  } catch {
    return new Date().toISOString(); // fallback on any unexpected error
  }
}

export function isValidUrl(url: string): boolean {
  try {
    // URL must be absolute (https://example.com/...)
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidIncomingPost(post: unknown): post is IncomingPost {
  if (typeof post !== "object" || post === null) return false;

  const p = post as Record<string, unknown>;

  return (
    typeof p.title === "string" &&
    p.title.trim().length > 0 &&
    typeof p.link === "string" &&
    p.link.trim().length > 0 &&
    isValidUrl(p.link) &&
    typeof p.published === "string" &&
    typeof p.source === "string"
  );
}

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
      return value;
    }
  }

  return null;
}

export function extractImage(item: RSSItem): string | null {
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
      return img;
    }
  }

  return null;
}

export function extractDate(item: RSSItem): string {
  const fields: (keyof RSSItem)[] = [
    "isoDate",
    "pubDate",
    "published",
    "dc:date",
    "updated",
    "lastBuildDate",
  ];

  for (const field of fields) {
    const value = item[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return "";
}

export const deleteNewsBlogs = mutation({
  handler: async (ctx) => {
    // List of domains to remove
    const bannedDomains = [
      "https://www.visualcapitalist.com",
      "https://www.moneylife.in",
      "https://www.theverge.com",
      "https://www.forbesindia.com",
      "https://www.cnbctv18.com",
      "https://finshots.in",
      "https://www.theceomagazine.com",
      "https://knowledge.wharton.upenn.edu",
      "https://www.businesstoday.in",
      "https://yourstory.com",
      "https://www.dsij.in",
      "https://www.moneycontrol.com",
      "https://thelogicalindian.com",
      "https://thedailybrief.zerodha.com",
      "https://www.fortuneindia.com",
      "https://shows.ivmpodcasts.com",
    ];


    // Fetch all blogs
    const blogs = await ctx.db.query("blogs").collect();

    // Match blogs whose feedUrl contains any banned domain
    const toDelete = blogs.filter((blog) =>
      bannedDomains.some((domain) => blog.feedUrl?.includes(domain))
    );

    // Delete matching blogs
    for (const blog of toDelete) {
      await ctx.db.delete(blog._id);
    }

    return { deleted: toDelete.length };
  },
});






