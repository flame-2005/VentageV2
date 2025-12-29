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
    authorLower: v.optional(v.string()), // 👈 NEW
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
    .index("by_author_pubDate", ["author", "pubDate"])
    .index("by_authorLower_pubDate", ["authorLower", "pubDate"])
    .index("by_company", ["companyName"])
    .index("by_pubDate", ["pubDate"])
    .index("by_classification_pubDate", ["classification", "pubDate"])
    .searchIndex("search_author_summary", {
      searchField: "author",
      filterFields: ["classification", "blogId"],
    })
    .searchIndex("search_summary", {
      searchField: "summary",
      filterFields: ["classification", "blogId"],
    })
    .searchIndex("search_company", {
      searchField: "companyName",
      filterFields: ["classification", "blogId"],
    })
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
    checked_market_cap: v.optional(v.boolean()),
    created_at: v.string(),
    updated_at: v.string(),
    search_tokens: v.optional(v.array(v.string())),
  })
    .index("nse_code", ["nse_code"])
    .index("record_hash", ["record_hash"])
    .index("name", ["name"])
    .index("search_tokens", ["search_tokens"])
    .index("marketCap", ["market_cap"])
    .searchIndex("company_name_search", {
      searchField: "name",
      staged: false,
    })
    .index("bse_code", ["bse_code"]),

  users: defineTable({
    username: v.string(),
    email: v.string(),
    userId: v.string(), // Supabase user ID
    lastUpdatedAt: v.number(),
    companiesFollowing: v.array(v.string()),
    authorsFollowing: v.optional(v.array(v.string())),
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

  companyPosts: defineTable({
    postId: v.id("posts"),
    companyName: v.string(),
    pubDate: v.string(),
    bseCode: v.optional(v.string()),
    nseCode: v.optional(v.string()),
    marketCap: v.optional(v.number()),
  })
    .index("by_post", ["postId"])
    .index("by_company_pubDate", ["companyName", "pubDate"])
    .index("by_company_postId", ["companyName", "postId"])
    .index("by_company", ["companyName"])
    .index("by_bse", ["bseCode"])
    .index("by_nse", ["nseCode"]),
  usersLink: defineTable({
    url: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.optional(v.string()),
    createdAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  trackers: defineTable({
    userId: v.id("users"),
    targetType: v.union(v.literal("company"), v.literal("author")),
    targetId: v.string(),
    isMuted: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_user_target", ["userId", "targetType", "targetId"]),

  notifications: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    targetType: v.union(v.literal("company"), v.literal("author")),
    targetId: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_isRead", ["userId", "isRead"])
    .index("by_post", ["postId"]),

  bugReports: defineTable({
    email: v.string(),
    pageLink: v.string(),
    bugDescription: v.string(),
    createdAt: v.number(),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("resolved")
      )
    ),
  })
    .index("by_email", ["email"])
    .index("by_createdAt", ["createdAt"]),
});
