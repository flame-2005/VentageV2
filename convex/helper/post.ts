import {
  action,
  internalMutation,
  mutation,
  query,
} from "../_generated/server";
import Papa from "papaparse";
import { hasCompanyData } from "./blogs";
import { api } from "../_generated/api";
import { calculateIsValidAnalysisParams, IncomingPost, RSSItem } from "../constant/posts";
import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";

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
    typeof p.author === "string" &&
    p.author.trim().length > 0 &&
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

export const migrateCompanyPosts = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 100;

    // Get all posts
    const posts = await ctx.db.query("posts").collect();

    let totalCreated = 0;
    let postsProcessed = 0;
    const errors: Array<{ postId: string; error: string }> = [];

    for (const post of posts) {
      postsProcessed++;

      try {
        // Check if post has companyDetails array
        if (post.companyDetails && post.companyDetails.length > 0) {
          // Create a companyPost entry for each company in the array
          for (const company of post.companyDetails) {
            await ctx.db.insert("companyPosts", {
              postId: post._id,
              companyName: company.company_name,
              bseCode: company.bse_code,
              nseCode: company.nse_code,
              pubDate: post.pubDate,
              marketCap: company.market_cap,
            });
            totalCreated++;
          }
        }
        // Fallback: if no companyDetails but has top-level company fields
        else if (post.companyName) {
          await ctx.db.insert("companyPosts", {
            postId: post._id,
            companyName: post.companyName,
            bseCode: post.bseCode,
            nseCode: post.nseCode,
            pubDate: post.pubDate,
            marketCap: undefined,
          });
          totalCreated++;
        }

        // Process in batches to avoid timeouts
        if (postsProcessed % batchSize === 0) {
          console.log(
            `Processed ${postsProcessed}/${posts.length} posts, created ${totalCreated} company posts`
          );
        }
      } catch (error) {
        errors.push({
          postId: post._id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: true,
      totalPostsProcessed: postsProcessed,
      totalCompanyPostsCreated: totalCreated,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

export const migrateCompanyPostsForPost = internalMutation({
  args: {
    postId: v.id("posts"),
  },

  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);

    if (!post) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    let totalCreated = 0;
    const created: string[] = [];

    try {
      // Case 1: post has companyDetails array
      if (post.companyDetails && post.companyDetails.length > 0) {
        for (const company of post.companyDetails) {
          await ctx.db.insert("companyPosts", {
            postId: post._id,
            companyName: company.company_name,
            bseCode: company.bse_code,
            nseCode: company.nse_code,
            pubDate: post.pubDate,
            marketCap: company.market_cap,
          });

          totalCreated++;
          created.push(company.company_name);
        }
      }
      // Case 2: fallback to top-level company fields
      else if (post.companyName) {
        await ctx.db.insert("companyPosts", {
          postId: post._id,
          companyName: post.companyName,
          bseCode: post.bseCode,
          nseCode: post.nseCode,
          pubDate: post.pubDate,
          marketCap: undefined,
        });

        totalCreated++;
        created.push(post.companyName);
      } else {
        return {
          success: true,
          message: "No company data found on post",
          totalCompanyPostsCreated: 0,
        };
      }

      return {
        success: true,
        postId,
        totalCompanyPostsCreated: totalCreated,
        companiesCreated: created,
      };
    } catch (error) {
      return {
        success: false,
        postId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const backfillAuthorLower = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 2000 }) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_authorLower_pubDate", (q) =>
        q.eq("authorLower", "")
      )
      .take(limit);

    for (const post of posts) {
      if (post.author) {
        await ctx.db.patch(post._id, {
          authorLower: post.author.toLowerCase(),
        });
      }
    }

    return posts.length;
  },
});

export function isValidAuthor(author: unknown): boolean {
  return (
    typeof author === "string" &&
    author !== "null" &&
    author.trim() !== "" &&
    author  !== "Eduinvesting Team"
  );
}




export function calculateIsValidAnalysis({
  nseCode ,
  bseCode,
  companyDetails,
  classification,
  author,
}: calculateIsValidAnalysisParams): boolean {
  const validClassifications = [
    "Company_analysis",
    "Multiple_company_analysis",
    "Sector_analysis",
  ];

  const excludedAuthors = [
    "Eduinvesting Team",
    "Lalitha Diwakarla",
    "Viceroy Research",
  ];

  // Condition 1: Classification check
  const hasValidClassification = validClassifications.includes(
    classification!
  );

  // Condition 2: Has valid BSE/NSE code or companyDetails

  const hasCompanyDetails =
    companyDetails !== undefined &&
    companyDetails !== null &&
    companyDetails.length > 0;

  const hasValidCompanyInfo =  hasCompanyDetails;

  // Condition 3: Author check
  const hasValidAuthor =
    author !== undefined &&
    author !== null &&
    author.trim() !== "" &&
    !excludedAuthors.includes(author);

  return hasValidClassification && hasValidCompanyInfo && hasValidAuthor;
}

