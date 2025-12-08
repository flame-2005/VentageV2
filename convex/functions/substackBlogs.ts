// convex/blogs.ts
import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import { paginationOptsValidator } from "convex/server";
import { hasCompanyData } from "../helper/blogs";

export const addBlogs = mutation({
  args: {
    name: v.string(),
    domain: v.string(),
    feedUrl: v.string(),
    source: v.string(),
  },
  handler: async (ctx, { name, domain, feedUrl, source }) => {
    await ctx.db.insert("blogs", {
      name,
      domain,
      feedUrl,
      lastCheckedAt: Date.now(),
      source,
    });
  },
});

export const getPostsByCompany = query({
  args: { companyName: v.string() },
  handler: async (ctx, { companyName }) => {
    // Use by_company index with range query
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_company", (q) =>
        q
          .gte("companyName", companyName)
          .lt("companyName", companyName + "\uffff")
      )
      .collect();

    const validPosts = posts.filter(hasCompanyData);
    // Lightweight client-side filtering
    const matchingPosts = validPosts.filter((post) => {
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
    // Also sort by pubDate descending
    return matchingPosts
      .filter(
        (post) =>
          post.author &&
          (post.bseCode || post.nseCode) &&
          post.author !== "null" &&
          post.author.trim() !== ""
      )
      .sort((a, b) => {
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      });
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

    const validPosts = posts.filter(hasCompanyData);

    // Filter to only include posts where companyName is defined and not 'null'
    return validPosts.filter(
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
      .withIndex("by_link", (q) => q.eq("link", post.link))
      .unique();

    if (existing) return null;

    return await ctx.db.insert("posts", post);
  },
});

export const checkExistingPost = query({
  args: { link: v.string() },

  handler: async (ctx, { link }) => {
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_link", (q) => q.eq("link", link))
      .first();

    if (existing) {
      return existing; // found match
    }

    return null; // no match found
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

export const getAllPosts50 = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("posts").order("desc").take(50);
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
        q.and(
          // ----------------------------
          // Condition 1: Classification must ALWAYS match one of the 3
          // ----------------------------
          q.or(
            q.eq(q.field("classification"), "Company_analysis"),
            q.eq(q.field("classification"), "Multiple_company_analysis"),
            q.eq(q.field("classification"), "Sector_analysis")
          ),

          // ----------------------------
          // Condition 2: ONE of these must be true (OR)
          // ----------------------------
          q.or(
            // has valid BSE code
            q.and(
              q.neq(q.field("bseCode"), undefined),
              q.neq(q.field("bseCode"), null),
              q.neq(q.field("bseCode"), "")
            ),

            // has valid NSE code
            q.and(
              q.neq(q.field("nseCode"), undefined),
              q.neq(q.field("nseCode"), null),
              q.neq(q.field("nseCode"), "")
            ),

            // has non-empty companyDetails
            q.and(
              q.neq(q.field("companyDetails"), undefined),
              q.neq(q.field("companyDetails"), null)
            )
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
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      link: v.optional(v.string()),
      author: v.optional(v.string()),
      pubDate: v.optional(v.string()),
      image: v.optional(v.string()),
      content: v.optional(v.string()),
      summary: v.optional(v.string()),
      companyName: v.optional(v.string()),
      bseCode: v.optional(v.string()),
      nseCode: v.optional(v.string()),
      category: v.optional(v.string()),
      classification: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      views: v.optional(v.string()),
      likes: v.optional(v.string()),
      lastCheckedAt: v.optional(v.number()),
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
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      ...args.data,
      lastCheckedAt: Date.now(),
    });
  },
});

export const bulkUpdatePosts = mutation({
  args: {
    updates: v.array(
      v.object({
        postId: v.id("posts"),
        data: v.object({
          title: v.optional(v.string()),
          description: v.optional(v.string()),
          link: v.optional(v.string()),
          author: v.optional(v.string()),
          pubDate: v.optional(v.string()),
          image: v.optional(v.string()),
          content: v.optional(v.string()),
          summary: v.optional(v.string()),
          companyName: v.optional(v.string()),
          bseCode: v.optional(v.string()),
          nseCode: v.optional(v.string()),
          category: v.optional(v.string()),
          classification: v.optional(v.string()),
          imageUrl: v.optional(v.string()),
          views: v.optional(v.string()),
          likes: v.optional(v.string()),
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
        }),
      })
    ),
  },

  handler: async (ctx, args) => {
    // Limit to avoid users sending thousands at once
    if (args.updates.length > 100) {
      throw new Error("Cannot update more than 100 posts at once");
    }

    for (const { postId, data } of args.updates) {
      await ctx.db.patch(postId, {
        ...data,
        lastCheckedAt: Date.now(),
      });
    }

    return { success: true, updated: args.updates.length };
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

    const validPage = result.page.filter(hasCompanyData);

    const sorted = validPage.sort((a, b) => {
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

    const matchingByName = await ctx.db
      .query("master_company_list")
      .withIndex("name", (q) => q.gte("name", searchTerm))
      .collect();

    const matchingByCode = await ctx.db
      .query("master_company_list")
      .withIndex("nse_code", (q) => q.gte("nse_code", searchTerm.toUpperCase()))
      .collect();

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

export const addBulkPost = mutation({
  args: {
    posts: v.array(
      v.object({
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
        views: v.optional(v.string()),
        likes: v.optional(v.string()),
        source: v.optional(v.string()),
        lastCheckedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const post of args.posts) {
      await ctx.db.insert("posts", {
        ...post,
        lastCheckedAt: Date.now(),
      });
    }
    return true;
  },
});

export const splitPosts = query({
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_classification", (q) =>
        q.eq("classification", "Company_analysis")
      )
      .collect();

    const posts2 = await ctx.db
      .query("posts")
      .withIndex("by_classification", (q) =>
        q.eq("classification", "Multiple_company_analysis")
      )
      .collect();

    const posts3 = await ctx.db
      .query("posts")
      .withIndex("by_classification", (q) =>
        q.eq("classification", "Sector_analysis")
      )
      .collect();
    const posts4 = await ctx.db
      .query("posts")
      .withIndex("by_classification", (q) =>
        q.eq("classification", "Multiple_company_update")
      )
      .collect();
    const posts5 = await ctx.db
      .query("posts")
      .withIndex("by_classification", (q) =>
        q.eq("classification", "General_investment_guide")
      )
      .collect();

    const all = [...posts, ...posts2, ...posts3, ...posts4, ...posts5];

    const matched = [];
    const notMatched = [];

    for (const p of all) {
      if (hasCompanyData(p)) matched.push(p);
      else notMatched.push(p);
    }

    return { matched, notMatched };
  },
});

export const incrementClickCount = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);

    if (!post) {
      throw new Error("Post not found");
    }

    const currentCount = post.clickedCount ?? 0;

    await ctx.db.patch(args.postId, {
      clickedCount: currentCount + 1,
      lastCheckedAt: Date.now(),
    });

    return { success: true, newCount: currentCount + 1 };
  },
});
