import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const submitBugReport = mutation({
  args: {
    email: v.string(),
    pageLink: v.string(),
    bugDescription: v.string(),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert("bugReports", {
      email: args.email.trim().toLowerCase(),
      pageLink: args.pageLink.trim(),
      bugDescription: args.bugDescription.trim(),
      createdAt: Date.now(),
      status: "open",
    });
  },
});