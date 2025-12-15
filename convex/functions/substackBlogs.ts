// convex/blogs.ts
import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import { paginationOptsValidator } from "convex/server";
import { hasCompanyData } from "../helper/blogs";
import { Id } from "../_generated/dataModel";

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
  args: {
    companyName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { companyName, limit = 50 }) => {
    // Step 1: Get top N companyPosts (sorted by pubDate via index)
    const companyPostEntries = await ctx.db
      .query("companyPosts")
      .withIndex("by_company_pubDate", (q) => q.eq("companyName", companyName))
      .order("desc")
      .collect();

    const postIds = [...new Set(companyPostEntries.map((cp) => cp.postId))];

    const posts = await Promise.all(
      postIds.map((postId) => ctx.db.get(postId))
    );

    // Step 3: Filter and return
    return posts
      .filter((post): post is NonNullable<typeof post> => {
        return (
          post !== null &&
          !!post.author &&
          post.author !== "null" &&
          post.author.trim() !== ""
        );
      })
      .slice(0, limit);
  },
});

export const getPostsByAuthor = query({
  args: { author: v.string() },
  handler: async (ctx, { author }) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author_pubDate", (q) => q.eq("author", author))
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
          ),

          // ----------------------------
          // Condition 3: Author must be defined and non-empty
          // ----------------------------
          q.and(
            q.neq(q.field("author"), undefined),
            q.neq(q.field("author"), null),
            q.neq(q.field("author"), "")
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

    // Step 1: get companyPost entries (already sorted by pubDate via index)
    const result = await ctx.db
      .query("companyPosts")
      .withIndex("by_company_pubDate", (q) =>
        q.gte("companyName", term).lt("companyName", term + "\uffff")
      )
      .order("desc")
      .paginate(paginationOpts);

    // Step 2: Keep only exact PREFIX matches (companyName.startsWith)
    const matchingCompanyPosts = result.page.filter((entry) =>
      entry.companyName.toLowerCase().startsWith(term.toLowerCase())
    );

    // Step 3: Extract unique postIds
    const postIds = [...new Set(matchingCompanyPosts.map((cp) => cp.postId))];

    // Step 4: Fetch posts
    const posts = await Promise.all(postIds.map((postId) => ctx.db.get(postId)));
    

    // Step 5: Filter valid posts (author good)
    const validPosts = posts.filter((post): post is NonNullable<typeof post> => {
      return (
        post !== null &&
        !!post.author &&
        post.author !== "null" &&
        post.author.trim() !== ""
      );
    });

    // No sorting needed — index already ensures correct pubDate DESC
    return {
      page: validPosts,
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
    // Return empty if search term too short
    if (!searchTerm || searchTerm.trim().length < 1) {
      return [];
    }

    const term = searchTerm.trim();
    const upperTerm = term.toUpperCase();
    const lowerTerm = term.toLowerCase();

    // Use index range queries with LIMITS to avoid full scans
    const matchingByName = await ctx.db
      .query("master_company_list")
      .withIndex("name", (q) => 
        q.gte("name", lowerTerm).lt("name", lowerTerm + "\uffff")
      )
      .take(20);

    const matchingByCode = await ctx.db
      .query("master_company_list")
      .withIndex("nse_code", (q) => 
        q.gte("nse_code", upperTerm).lt("nse_code", upperTerm + "\uffff")
      )
      .take(20); 

    // Deduplicate using Map
    const uniqueCompanies = new Map();
    
    for (const company of [...matchingByName, ...matchingByCode]) {
      if (!uniqueCompanies.has(company._id)) {
        uniqueCompanies.set(company._id, company);
      }
    }

    // Filter for exact prefix matches only
    const filtered = Array.from(uniqueCompanies.values())
      .filter((company) => {
        const companyName = company.name.toLowerCase();
        const nseCode = company.nse_code.toLowerCase();
        
        return (
          companyName.startsWith(lowerTerm) ||
          nseCode.startsWith(lowerTerm)
        );
      });

    // Sort by relevance
    const sorted = filtered.sort((a, b) => {
      const aCodeMatch = a.nse_code.toLowerCase().startsWith(lowerTerm);
      const bCodeMatch = b.nse_code.toLowerCase().startsWith(lowerTerm);
      const aNameMatch = a.name.toLowerCase().startsWith(lowerTerm);
      const bNameMatch = b.name.toLowerCase().startsWith(lowerTerm);

      // Prioritize: exact code match > code prefix > name prefix
      if (aCodeMatch && !bCodeMatch) return -1;
      if (!aCodeMatch && bCodeMatch) return 1;
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;

      return a.name.localeCompare(b.name);
    });

    // Return top 10
    return sorted.slice(0, 10).map((company) => ({
      companyName: company.name,
      nseCode: company.nse_code,
      bseCode: company.bse_code,
      isin: company.isin,
      instrumentToken: company.instrument_token,
    }));
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
      // Insert into posts table
      const postId = await ctx.db.insert("posts", {
        ...post,
        lastCheckedAt: Date.now(),
      });

      // --- Extract company names ---
      let companyNames: string[] = [];

      // Case 1: companyDetails present → use them
      if (post.companyDetails && post.companyDetails.length > 0) {
        companyNames = post.companyDetails.map((c) => c.company_name.trim());
      }

      // Case 2: fallback to companyName
      else if (post.companyName && post.companyName.trim() !== "") {
        companyNames = [post.companyName.trim()];
      }

      // No company → skip
      if (companyNames.length === 0) continue;

      // Insert into companyPosts
      for (const companyName of companyNames) {
        // Prevent duplicates (Convex-safe)
        const existing = await ctx.db
          .query("companyPosts")
          .withIndex("by_company_postId", (q) =>
            q.eq("companyName", companyName).eq("postId", postId)
          )
          .unique();

        if (!existing) {
          await ctx.db.insert("companyPosts", {
            companyName,
            postId,
            pubDate: post.pubDate,
          });
        }
      }
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

export const bulkUpdateBlogs = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("blogs"),
        imageUrl: v.optional(v.string()),
        extractionMethod: v.optional(v.string()),
        feedUrl: v.optional(v.string()),
      })
    ),
  },

  handler: async (ctx, args) => {
    if (args.updates.length > 100) {
      throw new Error("Cannot update more than 100 blogs at once");
    }

    for (const { id, ...data } of args.updates) {
      await ctx.db.patch(id, {
        ...data,
        lastCheckedAt: Date.now(),
      });
    }

    return { success: true, updated: args.updates.length };
  },
});


export const getPostById = query({
  args: { id: v.id("posts") },
  handler: async ({ db }, { id }) => {
    return await db.get(id as Id<"posts">);
  },
});
