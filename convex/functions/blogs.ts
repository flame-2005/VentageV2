import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { InsertedBlog } from "../helper/addBulkBlogs";

export const insertBlogs = mutation({
  args: {
    blogs: v.array(
      v.object({
        name: v.string(),
        domain: v.string(),
        feedUrl: v.string(),
        source: v.string(),
      })
    ),
  },
  handler: async (ctx, { blogs }): Promise<InsertedBlog[]> => {
    const insertedBlogs: InsertedBlog[] = [];

    for (const blog of blogs) {
      const id = await ctx.db.insert("blogs", {
        name: blog.name,
        domain: blog.domain,
        feedUrl: blog.feedUrl,
        source: blog.source,
        lastCheckedAt: Date.now(),
      });

      insertedBlogs.push({
        _id: id,
        _creationTime: Date.now(),
        name: blog.name,
        domain: blog.domain,
        feedUrl: blog.feedUrl,
        source: blog.source,
        lastCheckedAt: Date.now(),
      });
    }

    return insertedBlogs;
  },
});