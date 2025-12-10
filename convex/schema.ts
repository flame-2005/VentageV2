import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { link } from "fs";

export default defineSchema({
  blogs: defineTable({
    name: v.string(),
    domain: v.string(),
    feedUrl: v.string(),
    lastCheckedAt: v.optional(v.number()),
    source: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    extractionMethod: v.optional(v.string()),
  }),

  posts: defineTable({
    blogId: v.optional(v.id("blogs")),
    title: v.string(),
    description: v.optional(v.string()),
    link: v.string(),
    author: v.optional(v.string()),
    pubDate: v.string(),
    image: v.optional(v.string()),
    content: v.optional(v.string()),
    createdAt: v.number(),
    summary: v.optional(v.string()),
    companyName: v.optional(v.string()),
    bseCode: v.optional(v.string()),
    nseCode: v.optional(v.string()),
    category: v.optional(v.string()),
    companyDetails: v.optional(
      v.array(
        v.object({
          company_name: v.string(),
          bse_code: v.optional(v.string()),
          nse_code: v.optional(v.string()),
          market_cap: v.optional(v.number()),
        })
      )
    ),
    tags: v.optional(v.array(v.string())),
    classification: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    clickedCount: v.optional(v.number()),
    usersLiked: v.optional(v.array(v.string())),
    shareCount: v.optional(v.number()),
    usersShared: v.optional(v.array(v.string())),
    lastCheckedAt: v.optional(v.number()),
    source: v.optional(v.string()),
  })
    .index("by_blog", ["blogId"])
    .index("by_link", ["link"])
    .index("by_author", ["author"])
    .index("by_company", ["companyName"])
    .index("by_pubDate", ["pubDate"])
    .index("by_classification_pubDate", ["classification", "pubDate"])
    .index("by_classification", ["classification"]),

  master_company_list: defineTable({
    bse_code: v.optional(v.string()),
    nse_code: v.string(),
    name: v.string(),
    instrument_token: v.number(),
    isin: v.optional(v.string()),
    exchange: v.string(),
    market_cap: v.optional(v.number()),
    record_hash: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("nse_code", ["nse_code"])
    .index("record_hash", ["record_hash"])
    .index("name", ["name"]),

  users: defineTable({
    username: v.string(),
    email: v.string(),
    userId: v.string(), // Supabase user ID
    lastUpdatedAt: v.number(),
    companiesFollowing: v.array(v.string()), // Array of company names or IDs
    blogWebsitesFollowing: v.array(v.string()), // Array of blog URLs or IDs
    likedPosts: v.optional(v.array(v.id("posts"))),
    sharedPosts: v.optional(v.array(v.id("posts"))),
    avatarUrl: v.optional(v.string()),
    fullName: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_userId", ["userId"])
    .index("by_username", ["username"]),

  companies: defineTable({
    name: v.string(),
    nseCode: v.optional(v.string()),
    description: v.optional(v.string()),
    followersCount: v.number(),
  }).index("by_name", ["name"]),

  blogWebsites: defineTable({
    url: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    followersCount: v.number(),
  }).index("by_url", ["url"]),
});
