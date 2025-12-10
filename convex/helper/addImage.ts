import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

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
