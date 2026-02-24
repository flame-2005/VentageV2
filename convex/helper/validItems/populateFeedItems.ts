import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const backfillFeedItemsFromPosts = mutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.query("posts").paginate({
      numItems: 5000,
      cursor: args.cursor ?? null,
    });

    for (const post of result.page) {
      // Apply same filtering logic
      if (
        post.isValidAnalysis === true &&
        post.classification !== "Multiple_company_analysis"
      ) {
        // Check if already inserted (avoid duplicates)
        const existing = await ctx.db
          .query("validItems")
          .withIndex("by_itemId", (q) => q.eq("itemId", post._id))
          .first();

        if (!existing) {
          await ctx.db.insert("validItems", {
            sourceType: "post",
            itemId: post._id,
            sourceId: post.blogId,
            title: post.title,
            summary: post.summary!,
            link: post.link,
            authorName: post.author!,
            pubDate: post.pubDate,
            imageUrl: post.imageUrl,
            companyName: post.companyName!,
            bseCode: post.bseCode,
            nseCode: post.nseCode,
            companyDetails: post.companyDetails!,
            createdAt: post.createdAt,
            clickedCount: post.clickedCount,
            usersLiked: post.usersLiked,
            shareCount: post.shareCount,
            usersShared: post.usersShared,
            thumbnail: post.image,
            classification: post.classification!,
            tags: post.tags!,
            source: post.source!,
          });
        }
      }
    }

    return {
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const backfillFeedItemsFromVideos = mutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("videos")
      .withIndex("by_pubDate")
      .order("desc")
      .paginate({
        numItems: 2000, // safer for large datasets
        cursor: args.cursor ?? null,
      });

    for (const video of result.page) {
      // ----------------------------
      // Apply your exact filtering logic
      // ----------------------------

      const validClassification =
        video.classification === "Company_analysis" ||
        video.classification === "Sector_analysis" ||
        video.classification === "Management_interview";

      const hasValidCode =
        (video.bseCode && video.bseCode !== "") ||
        (video.nseCode && video.nseCode !== "") ||
        (video.companyDetails && Array.isArray(video.companyDetails));

      const validAuthor =
        video.channel_name &&
        video.channel_name !== "" &&
        video.channel_name !== "Money Purse";

      if (validClassification && hasValidCode && validAuthor) {
        // Avoid duplicates
        const existing = await ctx.db
          .query("validItems")
          .withIndex("by_itemId", (q) => q.eq("itemId", video._id))
          .first();

        if (!existing) {
          await ctx.db.insert("validItems", {
            sourceType: "video",
            itemId: video._id,
            sourceId: video.channelId,
            title: video.title,
            summary: video.summary!,
            link: video.link,
            authorName: video.channel_name!,
            pubDate: video.pubDate,
            imageUrl: video.imageUrl,
            companyName: video.companyName!,
            bseCode: video.bseCode,
            nseCode: video.nseCode,
            companyDetails: video.companyDetails!,
            createdAt: video.createdAt,
            clickedCount: video.clickedCount,
            usersLiked: video.usersLiked,
            shareCount: video.shareCount,
            usersShared: video.usersShared,
            thumbnail: video.thumbnail,
            classification: video.classification!,
            tags: video.tags!,
            source: video.source!,
          });
        }
      }
    }

    return {
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});
