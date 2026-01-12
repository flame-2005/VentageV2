import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { extractImage } from "./post";
import { RSSItem } from "../constant/posts";
import * as cheerio from "cheerio";

interface Blog {
  _id: Id<"blogs">;
  imageUrl?: string;
}

interface Post {
  _id: Id<"posts">;
  blogId?: Id<"blogs">;
  imageUrl?: string;
}

export const assignPostImagesFromBlogs = mutation({
  args: {},
  handler: async (ctx) => {
    const blogs = (await ctx.db.query("blogs").collect()) as Blog[];
    const posts = (await ctx.db.query("posts").collect()) as Post[];

    // Turn blogs into a map for O(1) lookup
    const blogMap = new Map<Id<"blogs">, Blog>();
    for (const blog of blogs) {
      blogMap.set(blog._id, blog);
    }

    let updated = 0;

    for (const post of posts) {

      if (post.imageUrl) continue;

      if (!post.blogId) continue;

      const blog = blogMap.get(post.blogId);
      if (!blog || !blog.imageUrl) continue;

      await ctx.db.patch(post._id, {
        imageUrl: blog.imageUrl,
      });

      updated++;
    }

    return { updated };
  },
});

export async function extractImageSmart(item: RSSItem): Promise<string | null> {
  // 1️⃣ Try RSS media fields first
  const rssImg = extractImage(item);
  if (rssImg) return rssImg;

  // 2️⃣ If RSS has no images → fetch article page
  if (!item.link) return null;

  try {
    console.log(`🌐 Fetching article to extract image: ${item.link}`);

    const res = await fetch(item.link, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      console.log("❌ Failed to load article:", res.status);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // 2a. Try OG Image
    const og = $('meta[property="og:image"]').attr("content");
    if (og) {
      console.log("🖼️ Extracted og:image:", og);
      return og;
    }

    // 2b. Try Twitter image
    const tw = $('meta[name="twitter:image"]').attr("content");
    if (tw) {
      console.log("🖼️ Extracted twitter:image:", tw);
      return tw;
    }

    // 2c. First article <img>
    const firstImg =
      $("article img").first().attr("src") || $("img").first().attr("src");
    if (firstImg) {
      console.log("🖼️ Extracted inline <img>:", firstImg);
      return firstImg;
    }
  } catch (err) {
    console.log("❌ Error fetching article HTML:", err);
  }

  console.log("⚠️ No image found even after HTML fallback:", item.link);
  return null;
}
