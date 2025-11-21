"use node";

import { action } from "../_generated/server";
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