import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const submitLink = mutation({
  args: {
    url: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {


    await ctx.db.insert("usersLink", {
      url: args.url.trim(),
      email: args.email?.trim(),
      notes: args.notes?.trim(),
      userId: args.userId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});
