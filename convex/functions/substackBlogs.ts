// convex/blogs.ts
import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import { paginationOptsValidator } from "convex/server";

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
    // Get all posts
    const allPosts = await ctx.db.query("posts").order("desc").collect();

    // Filter posts where the company name appears in the comma-separated list
    const matchingPosts = allPosts.filter((post) => {
      if (!post.companyName || post.companyName === "null") {
        return false;
      }

      // Split comma-separated company names and check if any match
      const companyNames = post.companyName
        .split(",")
        .map((name) => name.trim().toLowerCase());

      return companyNames.includes(companyName.toLowerCase());
    });

    // Filter to only include posts where author is defined and not 'null'
    return matchingPosts.filter(
      (post) =>
        post.author &&
        (post.bseCode || post.nseCode) &&
        post.author !== "null" &&
        post.author.trim() !== ""
    );
  },
});

export const getPostsByAuthor = query({
  args: { author: v.string() },
  handler: async (ctx, { author }) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("author", author))
      .order("desc")
      .collect();

    // Filter to only include posts where companyName is defined and not 'null'
    return posts.filter(
      (post) =>
        post.companyName &&
        (post.bseCode || post.nseCode) &&
        post.companyName !== "null" &&
        post.companyName.trim() !== ""
    );
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
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_link", q => q.eq("link", post.link))
      .unique();

    if (existing) return null;

    return await ctx.db.insert("posts", post);
  },
});

// export const getByLink = query({
//   args: { link: v.string() },
//   handler: async (ctx, { link }) => {
//     return await ctx.db
//       .query("posts")
//       .withIndex("by_link", (q) => q.eq("link", link))
//       .unique();
//   },
// });

export const getAllPosts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("posts").order("desc").collect();
  },
});

export const getPaginatedPosts = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("posts")
      .withIndex("by_pubDate")
      .order("desc")
      .filter((q) => 
        q.or(
          q.and(
            q.neq(q.field("bseCode"), undefined),
            q.neq(q.field("bseCode"), null),
            q.neq(q.field("bseCode"), "")
          ),
          q.and(
            q.neq(q.field("nseCode"), undefined),
            q.neq(q.field("nseCode"), null),
            q.neq(q.field("nseCode"), "")
          )
        )
      )
      .paginate(args.paginationOpts);
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
      id: v.number(),
    }),
  },
  handler: async (ctx, { searchTerm, paginationOpts }) => {
    const term = searchTerm.toUpperCase();

    // Use by_company index with range query for efficient prefix matching
    const result = await ctx.db
      .query("posts")
      .withIndex("by_company", (q) => 
        q.gte("companyName", term).lt("companyName", term + "\uffff")
      )
      .paginate(paginationOpts);

    const sorted = result.page.sort((a, b) => {
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });

    return {
      page: sorted,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const getCompanySuggestions = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, { searchTerm }) => {
    if (!searchTerm || searchTerm.trim().length < 1) {
      return [];
    }

    const lowerSearchTerm = searchTerm.toLowerCase().trim();

    // Query companies that start with the search term (using index)
    const matchingByName = await ctx.db
      .query("master_company_list")
      .withIndex("name", (q) => q.gte("name", searchTerm))
      .collect();

    // Also query by NSE code
    const matchingByCode = await ctx.db
      .query("master_company_list")
      .withIndex("nse_code", (q) => q.gte("nse_code", searchTerm.toUpperCase()))
      .collect();

    // Combine and deduplicate
    const combined = new Map();
    
    [...matchingByName, ...matchingByCode].forEach((company) => {
      if (!combined.has(company._id)) {
        combined.set(company._id, company);
      }
    });

    const allMatches = Array.from(combined.values())
      .filter((company) => {
        const companyName = company.name.toLowerCase();
        const nseCode = company.nse_code.toLowerCase();

        return (
          companyName.includes(lowerSearchTerm) ||
          nseCode.includes(lowerSearchTerm)
        );
      })
      .map((company) => ({
        companyName: company.name,
        nseCode: company.nse_code,
        bseCode: company.bse_code,
        isin: company.isin,
        instrumentToken: company.instrument_token,
      }));

    // Sort by relevance
    const suggestions = allMatches
      .sort((a, b) => {
        const aNameStartsWith = a.companyName
          .toLowerCase()
          .startsWith(lowerSearchTerm);
        const bNameStartsWith = b.companyName
          .toLowerCase()
          .startsWith(lowerSearchTerm);
        const aCodeStartsWith = a.nseCode
          .toLowerCase()
          .startsWith(lowerSearchTerm);
        const bCodeStartsWith = b.nseCode
          .toLowerCase()
          .startsWith(lowerSearchTerm);

        if (aCodeStartsWith && !bCodeStartsWith) return -1;
        if (!aCodeStartsWith && bCodeStartsWith) return 1;
        if (aNameStartsWith && !bNameStartsWith) return -1;
        if (!aNameStartsWith && bNameStartsWith) return 1;

        return a.companyName.localeCompare(b.companyName);
      })
      .slice(0, 10);

    return suggestions;
  },
});
