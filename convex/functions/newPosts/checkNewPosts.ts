"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";

import { fetchSubstackRSS } from "./platforms/substackPost";
import { fetchWordPressRSS } from "./platforms/wordpressPosts";
import { fetchBlogspotRSS } from "./platforms/blogstopPosts";
import { IncomingPost } from "../../constant/posts";

export const fetchAllBlogsAction = action({
  args: {},

  handler: async (ctx) => {
    const newPosts: IncomingPost[] = [];

    const blogs = await ctx.runQuery(api.functions.substackBlogs.getAllBlogs);

    // 1️⃣ SUBSTACK
    for (const blog of blogs) {
      if (blog.source === "substack") {
        const posts = await fetchSubstackRSS(blog.feedUrl);
        if (!posts) continue;

        for (const post of posts) {
          const exists = await ctx.runQuery(
            api.functions.substackBlogs.checkExistingPost,
            {
              link: post.link,
            }
          );

          if (!exists) {
            newPosts.push({
              ...post,
              blogId: blog._id,
            }); // keep IncomingPost structure
          }
        }
      }
      // 2️⃣ WORDPRESS
      if (blog.source === "wordpress") {
        const posts = await fetchWordPressRSS(blog.feedUrl);
        if (!posts) continue;

        for (const post of posts) {
          const exists = await ctx.runQuery(
            api.functions.substackBlogs.checkExistingPost,
            {
              link: post.link,
            }
          );

          if (!exists) {
            newPosts.push({
              ...post,
              blogId: blog._id,
            });
          }
        }
      }

      // 3️⃣ BLOGSPOT
      if (blog.source === "blogspot") {
        const posts = await fetchBlogspotRSS(blog.feedUrl);
        if (!posts) continue;

        for (const post of posts) {
          const exists = await ctx.runQuery(
            api.functions.substackBlogs.checkExistingPost,
            {
              link: post.link,
            }
          );

          if (!exists) {
            newPosts.push({
              ...post,
              blogId: blog._id,
            });
          }
        }
      }
    }
    console.log(`🆕 Total new posts: ${newPosts.length}`);

    if (newPosts.length > 0) {
      await ctx.runAction(
        api.functions.processBlogs.processBlogs.processAndSavePosts,
        {
          posts: newPosts,
        }
      );
    }

    return {
      success: true,
      newPosts: newPosts.length,
    };
  },
});
