import { action, query } from "../_generated/server";
import Papa from "papaparse";
import { hasCompanyData } from "./blogs";
import { api } from "../_generated/api";
import { IncomingPost } from "../constant/posts";


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

