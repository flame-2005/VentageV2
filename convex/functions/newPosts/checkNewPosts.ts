"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";

import { fetchSubstackRSS } from "./platforms/substackPost";
import { fetchWordPressRSS } from "./platforms/wordpressPosts";
import { fetchBlogspotRSS } from "./platforms/blogstopPosts";
import { IncomingPost } from "../../constant/posts";
import { fetchMediumPosts } from "./platforms/mediumPosts";
import { getAllPosts } from "./platforms/blogsiteFetchers/main";
import { normalizeUrl } from "../../helper/blogs";
import { isValidIncomingPost } from "../../helper/post";

export const fetchAllBlogsAction = action({
  args: {},

  handler: async (ctx) => {
    const newPosts: IncomingPost[] = [];

    const blogs = await ctx.runQuery(api.functions.substackBlogs.getAllBlogs);

    // 1️⃣ SUBSTACK
    for (const blog of blogs) {
      if (blog.source?.toLowerCase() === "substack") {
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
      if (blog.source?.toLowerCase() === "wordpress") {
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
      if (blog.source?.toLowerCase() === "blogspot") {
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
      if (blog.source?.toLowerCase() === "medium") {
        const posts = await fetchMediumPosts(blog.feedUrl);
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
      if (blog.source?.toLowerCase() === "others") {
        const posts = await getAllPosts(blog);
        if (!posts) continue;
        // 1️⃣ Collect links
        const links = posts.map((p) => p.link);

        // 2️⃣ Bulk existence check
        const existsMap = await ctx.runQuery(
          api.functions.substackBlogs.checkExistingPostsBulk,
          { links }
        );

        // 3️⃣ Filter & push new posts
        for (const post of posts) {
          const exists = existsMap[post.link];

          if (!exists && isValidIncomingPost(post)) {
            newPosts.push({
              ...post,
              blogId: blog._id,
            });
          } else if (!isValidIncomingPost(post)) {
            console.warn("❌ Invalid IncomingPost skipped:", post);
          }
        }
      }
    }
    console.log(`🆕 Total new posts: ${newPosts.length}`);

    if (newPosts.length > 0) {
      await ctx.scheduler.runAfter(
        0,
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
