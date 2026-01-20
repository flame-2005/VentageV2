"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";
import { Resend } from "resend";
import { fetchSubstackRSS } from "./platforms/substackPost";
import { fetchWordPressRSS } from "./platforms/wordpressPosts";
import { fetchBlogspotRSS } from "./platforms/blogstopPosts";
import { IncomingPost } from "../../constant/posts";
import { fetchMediumPosts } from "./platforms/mediumPosts";
import { getAllPosts } from "./platforms/blogsiteFetchers/main";
import { normalizeUrl } from "../../helper/blogs";
import { isValidIncomingPost } from "../../helper/post";

const resend = new Resend(process.env.RESEND_API_KEY);

export const fetchAllBlogsAction = action({
  args: {},

  handler: async (ctx) => {
    const newPosts: IncomingPost[] = [];

    try {
      const blogs = await ctx.runQuery(api.functions.substackBlogs.getAllBlogs);

      for (const blog of blogs) {
        // 1️⃣ SUBSTACK
        if (blog.source?.toLowerCase() === "substack") {
          const posts = await fetchSubstackRSS(blog.feedUrl);
          if (!posts) continue;

          const links = posts.map((p) => p.link);
          const existsMap = await ctx.runQuery(
            api.functions.substackBlogs.checkExistingPostsBulk,
            { links },
          );

          for (const post of posts) {
            const exists = existsMap[post.link];

            if (!exists && isValidIncomingPost(post)) {
              newPosts.push({ ...post, blogId: blog._id });
            }
          }
        }

        // 2️⃣ WORDPRESS
        if (blog.source?.toLowerCase() === "wordpress") {
          const posts = await fetchWordPressRSS(blog.feedUrl);
          if (!posts) continue;

          const links = posts.map((p) => p.link);
          const existsMap = await ctx.runQuery(
            api.functions.substackBlogs.checkExistingPostsBulk,
            { links },
          );

          for (const post of posts) {
            const exists = existsMap[post.link];

            if (!exists && isValidIncomingPost(post)) {
              newPosts.push({ ...post, blogId: blog._id });
            }
          }
        }

        // 3️⃣ BLOGSPOT
        if (blog.source?.toLowerCase() === "blogspot") {
          const posts = await fetchBlogspotRSS(blog.feedUrl);
          if (!posts) continue;

          const links = posts.map((p) => p.link);

          const existsMap = await ctx.runQuery(
            api.functions.substackBlogs.checkExistingPostsBulk,
            { links },
          );

          for (const post of posts) {
            const exists = existsMap[post.link];

            if (!exists && isValidIncomingPost(post)) {
              newPosts.push({ ...post, blogId: blog._id });
            }
          }
        }

        // 4️⃣ MEDIUM
        if (blog.source?.toLowerCase() === "medium") {
          const posts = await fetchMediumPosts(blog.feedUrl);
          if (!posts) continue;

          const links = posts.map((p) => p.link);

          const existsMap = await ctx.runQuery(
            api.functions.substackBlogs.checkExistingPostsBulk,
            { links },
          );

          for (const post of posts) {
            const exists = existsMap[post.link];

            if (!exists && isValidIncomingPost(post)) {
              newPosts.push({ ...post, blogId: blog._id });
            }
          }
        }

        // 5️⃣ OTHERS (bulk optimized)
        if (blog.source?.toLowerCase() === "others") {
          const posts = await getAllPosts(blog);
          if (!posts) continue;

          const links = posts.map((p) => p.link);

          const existsMap = await ctx.runQuery(
            api.functions.substackBlogs.checkExistingPostsBulk,
            { links },
          );

          for (const post of posts) {
            const exists = existsMap[post.link];

            if (!exists && isValidIncomingPost(post)) {
              newPosts.push({ ...post, blogId: blog._id });
            }
          }
        }
      }

      console.log(`🆕 Total new posts: ${newPosts.length}`);

      if (newPosts.length > 0) {
        await ctx.scheduler.runAfter(
          0,
          api.functions.processBlogs.processBlogs.processAndSavePosts,
          { posts: newPosts },
        );
      }

      return {
        success: true,
        newPosts: newPosts.length,
      };
    } catch (err: unknown) {
      console.error("❌ fetchAllBlogsAction failed", err);

      if (newPosts.length === 0) {
        const message =
          err instanceof Error
            ? (err.stack ?? err.message)
            : JSON.stringify(err);

        await resend.emails.send({
          from: "Blog Monitor <alerts@thevantedge.com>",
          to: ["alamshadab9876543210@gmail.com","Parikshit@pkeday.com"],
          subject: "❌ Blog Fetch Failed — No New Posts Added",
          html: `
            <h3>Blog Fetch Failed</h3>
            <pre>${message}</pre>
            <p>Time: ${new Date().toISOString()}</p>
          `,
        });
      }

      throw err; // keep Convex failure semantics
    }
  },
});
