// convex/blogs.ts
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { hasCompanyData } from "../helper/blogs";
import { Id } from "../_generated/dataModel";
import { isValidAuthor } from "../helper/post";

export const addBlogs = mutation({
  args: {
    name: v.string(),
    domain: v.string(),
    feedUrl: v.string(),
    source: v.string(),
  },
  handler: async (ctx, { name, domain, feedUrl, source }) => {
    const Id = await ctx.db.insert("blogs", {
      name,
      domain,
      feedUrl,
      lastCheckedAt: Date.now(),
      source,
    });

    return Id;
  },
});

export const getBlog = query({
  args: {
    blogId: v.id("blogs"),
  },
  handler: async (ctx, { blogId }) => {
    const blog = await ctx.db.get(blogId);

    if (!blog) {
      throw new Error(`Blog with ID ${blogId} not found`);
    }

    return blog;
  },
});

export const getPostsByCompany = query({
  args: {
    companyName: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { companyName, paginationOpts }) => {
    // Step 1: Get paginated companyPosts (sorted by pubDate via index)
    const companyPostPage = await ctx.db
      .query("companyPosts")
      .withIndex("by_company_pubDate", (q) => q.eq("companyName", companyName))
      .order("desc")
      .paginate(paginationOpts);

    // Step 2: Get unique postIds from this page
    const postIds = [...new Set(companyPostPage.page.map((cp) => cp.postId))];

    // Step 3: Fetch all posts for these IDs
    const posts = await Promise.all(
      postIds.map((postId) => ctx.db.get(postId)),
    );

    // Step 4: Filter valid posts
    const validPosts = posts.filter(
      (post): post is NonNullable<typeof post> => {
        return (
          post !== null &&
          isValidAuthor(post.author) &&
          !!post.companyDetails &&
          (post.classification === "Company_analysis" ||
            post.classification === "Multiple_company_analysis" ||
            post.classification === "Sector_analysis")
        );
      },
    );

    // Step 5: Return paginated result
    return {
      ...companyPostPage,
      page: validPosts,
    };
  },
});

export const getPostsByAuthor = query({
  args: {
    author: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { author, paginationOpts }) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author_pubDate", (q) => q.eq("author", author))
      .order("desc")
      .paginate(paginationOpts);

    // Filter the results page
    const validPosts = posts.page.filter(hasCompanyData);
    const filteredPosts = validPosts.filter(
      (post) =>
        post.companyDetails &&
        (post.classification === "Company_analysis" ||
          post.classification === "Multiple_company_analysis" ||
          post.classification === "Sector_analysis"),
    );

    return {
      ...posts,
      page: filteredPosts,
    };
  },
});

export const searchPostsByAuthor = query({
  args: {
    author: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { author, limit = 20 }) => {
    const term = author.trim().toLowerCase();

    // 🚨 CRITICAL GUARD
    if (term.length < 2) return [];

    const posts = await ctx.db
      .query("posts")
      .withSearchIndex("search_author_summary", (q) => q.search("author", term))
      .take(50);

    return posts.filter(hasCompanyData);
  },
});

export const searchEverywhere = query({
  args: {
    searchTerm: v.string(),
    classification: v.optional(v.string()),
    blogId: v.optional(v.id("blogs")),
    paginationOpts: paginationOptsValidator, // Use Convex's built-in validator
  },
  handler: async (
    ctx,
    { searchTerm, classification, blogId, paginationOpts },
  ) => {
    if (!searchTerm || !searchTerm.trim()) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const term = searchTerm.trim();

    // 1️⃣ Search by author
    const authorResults = await ctx.db
      .query("posts")
      .withSearchIndex("search_author_summary", (q) => q.search("author", term))
      .collect();

    // 2️⃣ Search by company
    const companyResults = await ctx.db
      .query("posts")
      .withSearchIndex("search_company", (q) => q.search("companyName", term))
      .collect();

    // 3️⃣ Merge & dedupe
    const seenIds = new Set<string>();
    const allResults = [...authorResults, ...companyResults].filter((post) => {
      if (seenIds.has(post._id)) return false;
      seenIds.add(post._id);
      return true;
    });

    // 4️⃣ Filter and sort by date
    const filteredAndSorted = allResults
      .filter(
        (post): post is NonNullable<typeof post> =>
          isValidAuthor(post.author) &&
          !!post.companyDetails &&
          (post.classification === "Company_analysis" ||
            post.classification === "Multiple_company_analysis" ||
            post.classification === "Sector_analysis"),
      )
      .sort((a, b) => b.pubDate.localeCompare(a.pubDate));

    // 5️⃣ Pagination logic using Convex's pattern
    const numItems = paginationOpts.numItems;
    let startIndex = 0;

    if (paginationOpts.cursor) {
      // Find the index of the item after the cursor
      const [cursorDate, cursorId] = paginationOpts.cursor.split("|");
      const cursorIndex = filteredAndSorted.findIndex(
        (post) => post.pubDate === cursorDate && post._id === cursorId,
      );

      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const endIndex = startIndex + numItems;
    const page = filteredAndSorted.slice(startIndex, endIndex);
    const isDone = endIndex >= filteredAndSorted.length;

    // Generate continuation cursor
    const continueCursor =
      !isDone && page.length > 0
        ? `${page[page.length - 1].pubDate}|${page[page.length - 1]._id}`
        : "";

    return {
      page,
      isDone,
      continueCursor,
    };
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

export const checkExistingPostsBulk = query({
  args: {
    links: v.array(v.string()),
  },

  handler: async (ctx, { links }) => {
    const existsMap: Record<string, boolean> = {};

    for (const link of links) {
      const existing = await ctx.db
        .query("posts")
        .withIndex("by_link", (q) => q.eq("link", link))
        .first();

      existsMap[link] = !!existing;
    }

    return existsMap;
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

export const getPostsWithPagination5000 = query({
  args: {
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const numItems = args.paginationOpts?.numItems ?? 5000;
    const cursor = args.paginationOpts?.cursor ?? null;

    const result = await ctx.db.query("posts").paginate({
      numItems,
      cursor,
    });

    return {
      page: result.page,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const getAllPosts50 = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("posts").order("desc").take(50);
  },
});

export const getPaginatedPosts = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return ctx.db
      .query("posts")
      .withIndex("by_validAnalysis_pubDate", (q) =>
        q.eq("isValidAnalysis", true),
      )
      .filter((q) =>
        q.neq(q.field("classification"), "Multiple_company_analysis"),
      )
      .order("desc")
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
          }),
        ),
      ),
      tags: v.optional(v.array(v.string())),
    }),
  },

  handler: async (ctx, args) => {
    /* 1️⃣ Update post */
    await ctx.db.patch(args.postId, {
      ...args.data,
      lastCheckedAt: Date.now(),
    });

    /* 2️⃣ Remove existing companyPosts */
    const existingCompanyPosts = await ctx.db
      .query("companyPosts")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    for (const row of existingCompanyPosts) {
      await ctx.db.delete(row._id);
    }

    /* 3️⃣ Insert updated companyPosts */
    if (args.data.companyDetails && args.data.pubDate) {
      for (const company of args.data.companyDetails) {
        await ctx.db.insert("companyPosts", {
          postId: args.postId,
          companyName: company.company_name,
          pubDate: args.data.pubDate,
          bseCode: company.bse_code,
          nseCode: company.nse_code,
          marketCap: company.market_cap,
        });
      }
    }
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
          isValidAnalysis: v.optional(v.boolean()),
          companyDetails: v.optional(
            v.array(
              v.object({
                company_name: v.string(),
                bse_code: v.optional(v.string()),
                nse_code: v.optional(v.string()),
                market_cap: v.optional(v.number()),
              }),
            ),
          ),
          tags: v.optional(v.array(v.string())),
        }),
      }),
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
    console.log(term);

    // Step 1: get companyPost entries (already sorted by pubDate via index)
    const result = await ctx.db
      .query("companyPosts")
      .withIndex("by_company_pubDate", (q) =>
        q.gte("companyName", term).lt("companyName", term + "\uffff"),
      )
      .order("desc")
      .paginate(paginationOpts);

    // Step 2: Keep only exact PREFIX matches (companyName.startsWith)
    const matchingCompanyPosts = result.page.filter((entry) =>
      entry.companyName.toLowerCase().startsWith(term.toLowerCase()),
    );

    // Step 3: Extract unique postIds
    const postIds = [...new Set(matchingCompanyPosts.map((cp) => cp.postId))];

    // Step 4: Fetch posts
    const posts = await Promise.all(
      postIds.map((postId) => ctx.db.get(postId)),
    );

    // Step 5: Filter valid posts (author good)
    const validPosts = posts.filter(
      (post): post is NonNullable<typeof post> => {
        return (
          post !== null &&
          isValidAuthor(post.author) &&
          !!post.companyDetails &&
          (post.classification === "Company_analysis" ||
            post.classification === "Multiple_company_analysis" ||
            post.classification === "Sector_analysis")
        );
      },
    );

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
    if (!searchTerm || !searchTerm.trim()) {
      return [];
    }

    const term = searchTerm.trim();
    const upperTerm = term.toUpperCase();

    const nseTerm = term.replace(" ", "").toUpperCase();

    // 1️⃣ Fuzzy name search (typo-tolerant)
    const nameResults = await ctx.db
      .query("master_company_list")
      .withSearchIndex("company_name_search", (q) => q.search("name", term))
      .take(8);

    // 2️⃣ Exact NSE code match
    const nseResults = await ctx.db
      .query("master_company_list")
      .withSearchIndex("nse_search", (q) => q.search("nse_code", nseTerm))
      .take(4);

    // 3️⃣ Exact BSE code match
    const bseResults = await ctx.db
      .query("master_company_list")
      .withIndex("bse_code", (q) => q.eq("bse_code", upperTerm))
      .take(1);

    // 4️⃣ Merge & dedupe using Set (no any)
    const seenIds = new Set<string>();
    const merged = [...nseResults, ...bseResults, ...nameResults].filter(
      (company) => {
        if (
          seenIds.has(company._id) ||
          company.market_cap === undefined ||
          company.market_cap === null
        ) {
          return false;
        }
        seenIds.add(company._id);
        return true;
      },
    );

    // 5️⃣ Relevance sorting
    const sorted = merged.sort((a, b) => {
      const aName = a.name.toUpperCase();
      const bName = b.name.toUpperCase();

      const aExact = aName === upperTerm;
      const bExact = bName === upperTerm;

      const aStarts = aName.startsWith(upperTerm);
      const bStarts = bName.startsWith(upperTerm);

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return a.name.localeCompare(b.name);
    });

    // 6️⃣ Final response
    return sorted.slice(0, 10).map((company) => ({
      companyName: company.name,
      nseCode: company.nse_code,
      bseCode: company.bse_code,
      isin: company.isin,
      instrumentToken: company.instrument_token,
    }));
  },
});

export const getAuthorSuggestions = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, { searchTerm }) => {
    if (!searchTerm || !searchTerm.trim()) {
      return [];
    }

    const term = searchTerm.trim();
    const lowerTerm = term.toLowerCase();

    // 1️⃣ Fuzzy author search (typo-tolerant)
    const authorResults = await ctx.db
      .query("posts")
      .withSearchIndex("search_author_summary", (q) => q.search("author", term))
      .take(8);

    // 2️⃣ Exact match on author index
    const exactResults = await ctx.db
      .query("posts")
      .withIndex("by_authorLower_pubDate", (q) =>
        q.eq("authorLower", lowerTerm),
      )
      .take(5);

    // 3️⃣ Merge & dedupe by author name
    const seenAuthors = new Set<string>();
    const uniqueAuthors = [...exactResults, ...authorResults]
      .filter((post) => {
        if (!post.author) return false;
        const authorKey = post.author.toLowerCase();
        if (seenAuthors.has(authorKey)) return false;
        seenAuthors.add(authorKey);
        return true;
      })
      .map((post) => ({
        author: post.author!,
        authorLower: post.author!.toLowerCase(),
      }));

    // 4️⃣ Relevance sorting
    const sorted = uniqueAuthors.sort((a, b) => {
      const aLower = a.authorLower;
      const bLower = b.authorLower;

      const aExact = aLower === lowerTerm;
      const bExact = bLower === lowerTerm;

      const aStarts = aLower.startsWith(lowerTerm);
      const bStarts = bLower.startsWith(lowerTerm);

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return a.author.localeCompare(b.author);
    });

    // 5️⃣ Final response
    return sorted.slice(0, 10).map((author) => ({
      author: author.author,
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
            }),
          ),
        ),
        tags: v.optional(v.array(v.string())),
        classification: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        views: v.optional(v.string()),
        likes: v.optional(v.string()),
        source: v.optional(v.string()),
        isValidAnalysis: v.optional(v.boolean()),
        lastCheckedAt: v.optional(v.number()),
      }),
    ),
  },

  handler: async (ctx, args) => {
    const insertedPosts: {
      postId: Id<"posts">;
      companyNames: string[];
      author?: string;
    }[] = [];

    for (const post of args.posts) {
      // -----------------------------
      // 1️⃣ Insert post
      // -----------------------------
      const postId = await ctx.db.insert("posts", {
        ...post,
        lastCheckedAt: Date.now(),
      });

      // -----------------------------
      // 2️⃣ Extract company names
      // -----------------------------
      let companyNames: string[] = [];

      if (post.companyDetails && post.companyDetails.length > 0) {
        companyNames = post.companyDetails.map((c) => c.company_name.trim());
      }

      // -----------------------------
      // 3️⃣ Insert into companyPosts
      // -----------------------------
      for (const companyName of companyNames) {
        const existing = await ctx.db
          .query("companyPosts")
          .withIndex("by_company_postId", (q) =>
            q.eq("companyName", companyName).eq("postId", postId),
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

      // -----------------------------
      // 4️⃣ Collect return payload
      // -----------------------------
      insertedPosts.push({
        postId,
        companyNames,
        author: post.author,
      });
    }

    return insertedPosts;
  },
});

export const splitPosts = query({
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_classification", (q) =>
        q.eq("classification", "Company_analysis"),
      )
      .collect();

    const posts2 = await ctx.db
      .query("posts")
      .withIndex("by_classification", (q) =>
        q.eq("classification", "Multiple_company_analysis"),
      )
      .collect();

    const posts3 = await ctx.db
      .query("posts")
      .withIndex("by_classification", (q) =>
        q.eq("classification", "Sector_analysis"),
      )
      .collect();
    const posts4 = await ctx.db
      .query("posts")
      .withIndex("by_classification", (q) =>
        q.eq("classification", "Multiple_company_update"),
      )
      .collect();
    const posts5 = await ctx.db
      .query("posts")
      .withIndex("by_classification", (q) =>
        q.eq("classification", "General_investment_guide"),
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
      }),
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
