// convex/feed.ts

import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

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


export const bulkInsertValidItems = mutation({
  args: {
    items: v.array(
      v.object({
        sourceType: v.union(
          v.literal("post"),
          v.literal("video"),
          v.literal("tweet")
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
          })
        ),
        classification: v.string(),
        tags: v.array(v.string()),
        source: v.string(),
      })
    ),
  },

  handler: async (ctx, args) => {
    if (args.items.length > 100) {
      throw new Error("Maximum 100 items allowed per batch.");
    }

    const insertedIds: Id<"validItems">[] = [];

    for (const item of args.items) {
      const id = await ctx.db.insert("validItems", {
        ...item,
      });

      insertedIds.push(id);
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
  },

  handler: async (ctx, { authorName, paginationOpts }) => {
    const items = await ctx.db
      .query("validItems")
      .withIndex("by_authorName_pubDate", (q) =>
        q.eq("authorName", authorName)
      )
      .order("desc")
      .paginate(paginationOpts);

    return items;
  },
});