"use node";

import { fetchHistoricalFromRSS } from "./universalRssFetcher";
import { api } from "../../_generated/api";
import { action } from "../../_generated/server";
import { v } from "convex/values";

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// New action for processing a single new blog
export const processNewBlogPosts = action({
  args: { blogId: v.id("blogs") },
  handler: async (ctx, { blogId }) => {
    try {
      // Fetch the blog
      const blog = await ctx.runQuery(api.functions.substackBlogs.getBlog, {
        blogId,
      });

      if (!blog) {
        console.log("❌ Blog not found");
        return;
      }

      // Fetch master company list
      console.log("📊 Fetching master company list…");

      console.log("\n--------------------------------------");
      console.log("📰 Fetching posts for:", blog.domain);

      let posts;
      try {
        posts = await fetchHistoricalFromRSS(blog.domain);

        posts = posts.map((post) => ({
          ...post,
          source: blog.source || "others",
        }));
      } catch (err) {
        console.error("❌ RSS fetch failed:", err);
        return;
      }

      console.log(`✅ Total fetched: ${posts.length}`);

      if (!posts || posts.length === 0) {
        console.log("⚠️ No posts found, skipping scheduling.");
        return;
      }

      const BATCH_SIZE = 30;

      const postBatches = chunkArray(posts, BATCH_SIZE);

      await Promise.all(
        postBatches.map((batch, index) =>
          ctx.scheduler.runAfter(
            index * 100,
            api.functions.processBlogs.processBlogs.processAndSavePosts,
            {
              posts: batch,
            },
          ),
        ),
      );

      return {
        success: true,
      };
    } catch (err) {
      console.error("❌ Error processing blog:", err);
      throw err;
    }
  },
});
