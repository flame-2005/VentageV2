import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";

export const list = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("posts").collect();
  },
});

export const patch = internalMutation({
  args: {
    id: v.id("posts"),
    content: v.optional(v.any()),
    description: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      content: args.content,
      description: args.description,
    });
  },
});