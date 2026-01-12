"use node";

import { v } from "convex/values";
import { action, mutation } from "../_generated/server";
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

    console.log(
      `Inserted ${insertedBlogs.length} blogs. Running classification…`
    );

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

export const addSingleBlog = action({
  args: {
    name: v.string(),
    domain: v.string(),
    feedUrl: v.string(),
    source: v.string(),
  },

  handler: async (ctx, { name, domain, feedUrl, source }) => {
    // 1️⃣ Insert blog
    const blogId = await ctx.runMutation(api.functions.substackBlogs.addBlogs, {
      name,
      domain,
      feedUrl,
      source,
    });

    // 2️⃣ Shape it like InsertedBlog
    const insertedBlog: InsertedBlog = {
      _id: blogId,
      name,
      domain,
      feedUrl,
      source,
      _creationTime: Date.now(),
      lastCheckedAt: Date.now(),
    };

    // 3️⃣ Run classification
    const { updates } = await classifyBlogs([insertedBlog]);

    // 4️⃣ Apply updates if any
    if (updates.length > 0) {
      await ctx.runMutation(api.functions.substackBlogs.bulkUpdateBlogs, {
        updates,
      });
    }

    // 5️⃣ Schedule async RSS post processing
    await ctx.scheduler.runAfter(
      0,
      api.functions.fetch.getAllRssPosts.processNewBlogPosts,
      { blogId }
    );

    console.log(`✅ Blog added: ${name} (${blogId})`);
    console.log(`📤 RSS processing scheduled for: ${domain}`);

    // 5️⃣ Return useful response
    return {
      inserted: 1,
      updated: updates.length,
      updates,
    };
  },
});
