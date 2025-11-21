// convex/blogs.ts
import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { api } from "../_generated/api";

export const add = mutation({
  args: {
    name: v.string(),
    domain: v.string(),
    feedUrl: v.string(),
    historicalPostUrl: v.optional(v.string()), // ✅ optional field for API URL
  },
  handler: async (ctx, { name, domain, feedUrl, historicalPostUrl }) => {
    await ctx.db.insert("blogs", {
      name,
      domain,
      feedUrl,
      historicalPostUrl: historicalPostUrl || `https://${domain}/api/v1/posts`,
      lastCheckedAt: Date.now(),
      companyName: "",
    });
  },
});

export const getPostsByCompany = query({
  args: { companyName: v.string() },
  handler: async (ctx, { companyName }) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_companyName", (q) => q.eq("companyName", companyName))
      .order("desc")
      .collect();
  },
});

export const getPostsByAuthor = query({
  args: { author: v.string() },
  handler: async (ctx, { author }) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("author", author))
      .order("desc")
      .collect();
  },
});


export const getBlogs = query({
  handler: async (ctx) => {
    return await ctx.db.query("blogs").collect();
  },
});

export const getAllBlogs = query(async (ctx) => {
  return await ctx.db.query("blogs").collect();
});

export const addPost = mutation({
  args: {
    blogId: v.id("blogs"),
    title: v.string(),
    description: v.optional(v.string()),
    link: v.string(),
    author: v.optional(v.string()),
    pubDate: v.string(),
    image: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("posts", {
      ...args,
      createdAt: Date.now(),
    });
    return postId;
  },
});

export const addPostIfNew = mutation({
  args: {
    author: v.optional(v.string()),
    image: v.optional(v.string()),
    blogId: v.id("blogs"),
    title: v.string(),
    link: v.string(),
    pubDate: v.string(),
    createdAt: v.number(),
    companyName: v.optional(v.string()),
  },
  handler: async (ctx, post) => {
    // Check if post already exists by link
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_link", (q) => q.eq("link", post.link))
      .unique();

    if (existing) {
      console.log(`Post already exists: ${post.title}`);
      return null;
    }

    const postId = await ctx.db.insert("posts", {
      ...post,
    });

    console.log(`✅ Inserted new post with ID: ${postId}`);
    return postId;
  },
});

export const getByLink = query({
  args: { link: v.string() },
  handler: async (ctx, { link }) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_link", (q) => q.eq("link", link))
      .unique();
  },
});

export const getAllPosts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("posts").collect();
  },
});

// New paginated query for posts
export const getPaginatedPosts = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
      id: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { paginationOpts }) => {
    return await ctx.db
      .query("posts")
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const updateCompanyName = mutation({
  args: {
    postId: v.id("posts"),
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, { companyName: args.companyName });
  },
});

export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    data: v.object({
      summary: v.optional(v.string()),
      companyName: v.optional(v.string()),
      bseCode: v.optional(v.string()),
      nseCode: v.optional(v.string()),
      category: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      ...args.data,
      lastCheckedAt: Date.now(),
    });
  },
});

export const searchPosts = query({
  args: {
    searchTerm: v.string(),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
      id: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { searchTerm, paginationOpts }) => {
    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    // Get all posts
    const allPosts = await ctx.db
      .query("posts")
      .order("desc")
      .collect();

    // Filter posts based on search term
    const filteredPosts = allPosts.filter((post) => {
      const title = post.title?.toLowerCase() || "";
      const summary = post.summary?.toLowerCase() || "";
      const author = post.author?.toLowerCase() || "";
      const companyName = post.companyName?.toLowerCase() || "";
      const nseCode = post.nseCode?.toLowerCase() || "";

      return (
        title.includes(lowerSearchTerm) ||
        summary.includes(lowerSearchTerm) ||
        author.includes(lowerSearchTerm) ||
        companyName.includes(lowerSearchTerm) ||
        nseCode.includes(lowerSearchTerm)
      );
    });

    // Manual pagination
    const cursor = paginationOpts.cursor;
    const numItems = paginationOpts.numItems;
    
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = filteredPosts.findIndex(
        (post) => post._id.toString() === cursor
      );
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }

    const endIndex = startIndex + numItems;
    const page = filteredPosts.slice(startIndex, endIndex);
    const isDone = endIndex >= filteredPosts.length;
    
    // Match Convex's PaginationResult type exactly
    return {
      page,
      continueCursor: isDone ? (cursor || "") : page[page.length - 1]._id.toString(),
      isDone,
    };
  },
});