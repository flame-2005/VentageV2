"use node";

import { action } from "../_generated/server";
import Parser from "rss-parser";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { tryParseFeed } from "./feedParser";

interface Blog {
  _id: Id<"blogs">;
  feedUrl: string;
  imageUrl?: string;
}

export default action({
  handler: async (ctx) => {
    const parser = new Parser();

    const blogs = (await ctx.runQuery(
      api.functions.substackBlogs.getAllBlogs,
      {}
    )) as Blog[];

    const updates: { id: Id<"blogs">; imageUrl: string }[] = [];

    for (const blog of blogs) {
      if (!blog.feedUrl) continue;
      if (blog.imageUrl) continue;

      try {
        const feed = await tryParseFeed(parser, blog.feedUrl);

        if (!feed) {
          console.log("No valid RSS feed found for:", blog.feedUrl);
          continue;
        }

        const feedRecord = feed as unknown as Record<string, unknown>;

        const mediaThumbnail = feedRecord["media:thumbnail"] as
          | { url?: string }
          | undefined;

        const feedImage =
          feed.image?.url || feed.image?.link || mediaThumbnail?.url || null;
      } catch (e) {
        console.log("Feed fetch failed:", blog.feedUrl, e);
      }
    }

    // -------------------------------
    // 🔥 BULK UPDATE IN BATCHES OF 100
    // -------------------------------
    let updated = 0;

    for (let i = 0; i < updates.length; i += 100) {
      const chunk = updates.slice(i, i + 100);

      await ctx.runMutation(api.functions.substackBlogs.bulkUpdateBlogs, {
        updates: chunk,
      });

      updated += chunk.length;
    }

    return { updated };
  },
});
