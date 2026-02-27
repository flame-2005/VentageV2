// convex/feed.ts

import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { isValidAuthor } from "../helper/post";

export const getFeedItems = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("validItems")
      .withIndex("by_pubDate")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getFeedByType = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sourceType: v.optional(
      v.union(v.literal("post"), v.literal("video"), v.literal("tweet")),
    ),
  },
  handler: async (ctx, args) => {
    const { sourceType } = args;

    if (sourceType !== undefined) {
      return await ctx.db
        .query("validItems")
        .withIndex("by_sourceType_pubDate", (q) =>
          q.eq("sourceType", sourceType),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("validItems")
      .withIndex("by_pubDate")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const bulkInsertValidItems = mutation({
  args: {
    items: v.array(
      v.object({
        sourceType: v.union(
          v.literal("post"),
          v.literal("video"),
          v.literal("tweet"),
        ),
        itemId: v.string(),
        sourceId: v.optional(v.string()),
        title: v.string(),
        link: v.string(),
        authorName: v.string(),
        pubDate: v.string(),
        createdAt: v.number(),
        summary: v.string(),
        imageUrl: v.optional(v.string()),
        thumbnail: v.optional(v.string()),
        duration: v.optional(v.string()),
        companyName: v.string(),
        bseCode: v.optional(v.string()),
        nseCode: v.optional(v.string()),
        companyDetails: v.array(
          v.object({
            company_name: v.string(),
            bse_code: v.optional(v.string()),
            nse_code: v.optional(v.string()),
            market_cap: v.optional(v.number()),
          }),
        ),
        classification: v.string(),
        tags: v.array(v.string()),
        source: v.string(),
      }),
    ),
  },

  handler: async (ctx, args) => {
    if (args.items.length > 100) {
      throw new Error("Maximum 100 items allowed per batch.");
    }

    const insertedIds: {
      itemsId: Id<"validItems">;
      companyNames: string[];
      author?: string;
    }[] = [];

    for (const post of args.items) {
      // -----------------------------
      // 1️⃣ Insert post
      // -----------------------------
      const itemId = await ctx.db.insert("validItems", {
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
          .query("companyValidItems")
          .withIndex("by_company_itemsId", (q) =>
            q.eq("companyName", companyName).eq("itemsId", itemId),
          )
          .unique();

        if (!existing) {
          await ctx.db.insert("companyValidItems", {
            companyName,
            sourceType: post.sourceType,
            itemsId: itemId,
            pubDate: post.pubDate,
          });
        }
      }

      // -----------------------------
      // 4️⃣ Collect return payload
      // -----------------------------
      insertedIds.push({
        itemsId: itemId,
        companyNames,
        author: post.authorName,
      });
    }

    return {
      insertedCount: insertedIds.length,
      insertedIds,
    };
  },
});

export const incrementClickCount = mutation({
  args: {
    validItemId: v.id("validItems"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.validItemId);

    if (!post) {
      throw new Error("Post not found");
    }

    const currentCount = post.clickedCount ?? 0;

    await ctx.db.patch(args.validItemId, {
      clickedCount: currentCount + 1,
    });

    return { success: true, newCount: currentCount + 1 };
  },
});

export const getValidItemsByAuthor = query({
  args: {
    authorName: v.string(),
    paginationOpts: paginationOptsValidator,
    sourceType: v.optional(
      v.union(v.literal("post"), v.literal("video"), v.literal("tweet")),
    ),
  },

  handler: async (ctx, args) => {
    const { authorName, paginationOpts, sourceType } = args;

    if (sourceType !== undefined) {
      return await ctx.db
        .query("validItems")
        .withIndex("by_authorName_sourceType_pubDate", (q) =>
          q.eq("authorName", authorName).eq("sourceType", sourceType),
        )
        .order("desc")
        .paginate(paginationOpts);
    }

    // All (no sourceType filter)
    return await ctx.db
      .query("validItems")
      .withIndex("by_authorName_pubDate", (q) => q.eq("authorName", authorName))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const getValidItemsByCompany = query({
  args: {
    companyName: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { companyName, paginationOpts }) => {
    // Step 1: Get paginated companyPosts (sorted by pubDate via index)
    const companyPostPage = await ctx.db
      .query("companyValidItems")
      .withIndex("by_company_pubDate", (q) => q.eq("companyName", companyName))
      .order("desc")
      .paginate(paginationOpts);

    // Step 2: Get unique postIds from this page
    const postIds = [...new Set(companyPostPage.page.map((cp) => cp.itemsId))];

    // Step 3: Fetch all posts for these IDs
    const posts = await Promise.all(
      postIds.map((postId) => ctx.db.get(postId)),
    );

    const filteredPosts = posts.filter(
      (post): post is Doc<"validItems"> => post !== null,
    );

    // Step 5: Return paginated result
    return {
      ...companyPostPage,
      page: filteredPosts,
    };
  },
});

export const getValidPostsByCompany = query({
  args: {
    companyName: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { companyName, paginationOpts }) => {
    const companyPostPage = await ctx.db
      .query("companyValidItems")
      .withIndex("by_company_sourceType_pubDate", (q) =>
        q.eq("companyName", companyName).eq("sourceType", "post"),
      )
      .order("desc")
      .paginate(paginationOpts);

    const postIds = [...new Set(companyPostPage.page.map((cp) => cp.itemsId))];

    const posts = await Promise.all(
      postIds.map((postId) => ctx.db.get(postId)),
    );

    const filteredPosts = posts.filter(
      (post): post is Doc<"validItems"> => post !== null,
    );

    return {
      ...companyPostPage,
      page: filteredPosts,
    };
  },
});

export const getValidVideosByCompany = query({
  args: {
    companyName: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { companyName, paginationOpts }) => {
    const companyVideoPage = await ctx.db
      .query("companyValidItems")
      .withIndex("by_company_sourceType_pubDate", (q) =>
        q.eq("companyName", companyName).eq("sourceType", "video"),
      )
      .order("desc")
      .paginate(paginationOpts);

    const videoIds = [
      ...new Set(companyVideoPage.page.map((cp) => cp.itemsId)),
    ];

    const videos = await Promise.all(
      videoIds.map((videoId) => ctx.db.get(videoId)),
    );
    const filteredVideos = videos.filter(
      (video): video is Doc<"validItems"> => video !== null,
    );

    return {
      ...companyVideoPage,
      page: filteredVideos,
    };
  },
});

export const getValidItemById = query({
  args: {
    id: v.id("validItems"),
  },
  handler: async ({ db }, { id }) => {
    return await db.get(id);
  },
});