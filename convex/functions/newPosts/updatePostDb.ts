import { v } from "convex/values";
import { internalMutation, query } from "../../_generated/server";
import { api } from "../../_generated/api";
import { calculateIsValidPost } from "../../helper/post";

export const getLastMonthRecheckCandidates = query({
  args: {
    cutoffIso: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { cutoffIso, limit = 200 }) => {
    const recentPosts = await ctx.db
      .query("posts")
      .withIndex("by_pubDate", (q) => q.gte("pubDate", cutoffIso))
      .order("desc")
      .take(limit);

    return recentPosts.filter((post) => {
      const isTargetClass =
        post.classification === "Company_analysis" ||
        post.classification === "Sector_analysis";

      if (!isTargetClass) return false;

      return calculateIsValidPost({
        companyDetails: post.companyDetails,
        classification: post.classification,
        author: post.author,
      });
    });
  },
});

export const patchRecheckedPost = internalMutation({
  args: {
    postId: v.id("posts"),
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
    companyName: v.optional(v.string()),
    bseCode: v.optional(v.string()),
    nseCode: v.optional(v.string()),
    isValidAnalysis: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      companyDetails: args.companyDetails,
      companyName: args.companyName,
      bseCode: args.bseCode,
      nseCode: args.nseCode,
      isValidAnalysis: args.isValidAnalysis,
      lastCheckedAt: Date.now(),
    });

    if (!args.isValidAnalysis) {
      return { updated: true, insertedToValidItems: false };
    }
    await ctx.scheduler.runAfter(
      0,
      api.functions.validItems.insertValidItemBySourceId,
      { postId: args.postId },
    );

    return { updated: true, insertedToValidItems: true, queued: true };
  },
});
