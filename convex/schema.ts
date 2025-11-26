import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { link } from "fs";

export default defineSchema({
  blogs: defineTable({
    name: v.string(),
    domain: v.string(),
    feedUrl: v.string(),
    historicalPostUrl: v.optional(v.string()),
    lastCheckedAt: v.optional(v.number()),
    category: v.optional(v.string()),
    companyName: v.optional(v.string()),
  }),

  posts: defineTable({
    blogId: v.id("blogs"),
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
    imageUrl: v.optional(v.string()),
    views: v.optional(v.string()),
    likes: v.optional(v.string()),
    lastCheckedAt: v.optional(v.number()),
  })
    .index("by_blog", ["blogId"])
    .index("by_link", ["link"])
    .index("by_author", ["author"])
    .index("by_company", ["companyName"])
    .index("by_pubDate", ["pubDate"]),

  master_company_list: defineTable({
    bse_code: v.optional(v.string()),
    nse_code: v.string(),
    name: v.string(),
    instrument_token: v.number(),
    isin: v.optional(v.string()),
    exchange: v.string(),
    record_hash: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("nse_code", ["nse_code"])
    .index("record_hash", ["record_hash"])
    .index("name", ["name"]),
});
