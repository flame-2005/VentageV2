"use node"

import { v } from "convex/values";
import { action } from "../_generated/server";
import { classifyBlogs } from "../helper/classifyBlog";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Define the blog type based on your schema
export type InsertedBlog = {
  _id: Id<"blogs">;
  _creationTime: number;
  name: string;
  domain: string;
  feedUrl: string;
  source: string;
  lastCheckedAt: number;
};

export const bulkAddBlogs = action({
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

  handler: async (ctx, { blogs }) => {
    // Call a mutation to insert blogs
    const insertedBlogs: InsertedBlog[] = await ctx.runMutation(
      api.functions.blogs.insertBlogs,
      { blogs }
    );

    console.log(`Inserted ${insertedBlogs.length} blogs. Running classification…`);

    const { updates } = await classifyBlogs(insertedBlogs);

    await ctx.runMutation(api.functions.substackBlogs.bulkUpdateBlogs, {
      updates,
    });

    return {
      inserted: insertedBlogs.length,
      updated: updates.length,
      updates,
    };
  },
});