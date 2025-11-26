"use node"

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [["content:encoded", "contentEncoded"]],
  },
});

export const fetchAndUpdateFeeds = action(async (ctx) => {
  const blogs = await ctx.runQuery(api.functions.substackBlogs.getAllBlogs); 

  console.log(`🔄 Fetching feeds for ${blogs.length} blogs...`);

  for (const blog of blogs) {
    try {
      console.log(`📡 Fetching feed: ${blog.name}`);
      const feed = await parser.parseURL(blog.feedUrl);
      
      let newPostsCount = 0;

      for (const item of feed.items) {

        const link = item.link!;
        const title = item.title || "Untitled";
        const image =
          item.enclosure?.url ??
          item["content:encoded"]?.match(/<img[^>]+src="([^">]+)"/)?.[1] ??
          null;

        // 1️⃣ First, add the post to the database
        const postId = await ctx.runMutation(
          api.functions.substackBlogs.addPostIfNew, 
          {
            blogId: blog._id,
            link,
            title,
            image,
            author: item.creator || "",
            pubDate: item.isoDate || item.pubDate || "",
            createdAt: Date.now(),
          }
        );

        // 2️⃣ Then schedule AI extraction for the new post
        if (postId) {
          await ctx.scheduler.runAfter(
            1000, // Wait 1 second before extraction
            api.functions.labeling.extractCompanyAction,
            {
              postId,
              title,
              link,
            }
          );
          newPostsCount++;
          console.log(`✨ Added new post: ${title}`);
        }
      }

      console.log(`✅ Updated feed for ${blog.name} - ${newPostsCount} new posts`);

    } catch (err) {
      console.error(`❌ Failed fetching ${blog.feedUrl}`, err);
    }
  }

  console.log("🎉 All feeds updated!");
});