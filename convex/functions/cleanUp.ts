import { action, mutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const removeHeavyFields = action(async (ctx): Promise<string> => {
  const posts = await ctx.runQuery(internal.posts.list);

  for (const post of posts) {
    await ctx.runMutation(internal.posts.patch, {
      id: post._id,
      content: undefined,
      description: undefined,
    });
  }

  return `Cleaned ${posts.length} posts`;
});

export const fixOldPubDates = mutation({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();

    for (const post of posts) {
      const oldDate = post.pubDate;
      if (!oldDate) continue;

      let isoDate = null;

      try {
        isoDate = new Date(oldDate).toISOString();
      } catch {
        console.log("❌ Invalid pubDate:", post._id, oldDate);
        continue;
      }

      // Update only if ISO conversion succeeded AND value is different
      if (oldDate !== isoDate) {
        await ctx.db.patch(post._id, { pubDate: isoDate });
      }
    }

    return "Done: All pubDates converted to ISO format.";
  },
});
