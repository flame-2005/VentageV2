import { v } from "convex/values";
import { internalAction, mutation, query } from "../../_generated/server";
import { api } from "../../_generated/api";

export const trackTarget = mutation({
  args: {
    targetType: v.union(v.literal("company"), v.literal("author")),
    targetId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = args.userId;
    if (!userId) throw new Error("Unauthorized");

    // Prevent duplicates
    const existing = await ctx.db
      .query("trackers")
      .withIndex("by_user_target", (q) =>
        q
          .eq("userId", userId)
          .eq("targetType", args.targetType)
          .eq("targetId", args.targetId)
      )
      .first();

    if (existing) return; // idempotent

    await ctx.db.insert("trackers", {
      userId,
      targetType: args.targetType,
      targetId: args.targetId,
      isMuted: false,
      createdAt: Date.now(),
    });
  },
});

export const untrackTarget = mutation({
  args: {
    targetType: v.union(v.literal("company"), v.literal("author")),
    targetId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = args.userId;
    if (!userId) throw new Error("Unauthorized");

    const tracker = await ctx.db
      .query("trackers")
      .withIndex("by_user_target", (q) =>
        q
          .eq("userId", userId)
          .eq("targetType", args.targetType)
          .eq("targetId", args.targetId)
      )
      .first();

    if (tracker) {
      await ctx.db.delete(tracker._id);
    }
  },
});

export const getTrackersByTarget = query({
  args: {
    targetType: v.union(v.literal("company"), v.literal("author")),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trackers")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId)
      )
      .collect();
  },
});
