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
    .index("by_companyName", ["companyName"])
    .index("by_author", ["author"])
});
