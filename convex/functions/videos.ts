// convex/blogs.ts
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { Id } from "../_generated/dataModel";

export const addChannel = mutation({
  args: {
    name: v.string(),
    domain: v.string(),
    feedUrl: v.string(),
    source: v.string(),
  },
  handler: async (ctx, { name, domain, feedUrl, source }) => {
    const Id = await ctx.db.insert("channels", {
      name,
      domain,
      feedUrl,
      lastCheckedAt: Date.now(),
      source,
    });

    return Id;
  },
});

export const getChannelById = query({
  args: { 
    channelId: v.id("channels"), 
  },
  handler: async (ctx, { channelId }) => {
    const channel = await ctx.db.get(channelId);
    
    if (!channel) {
      throw new Error(`Channel with ID ${channelId} not found`);
    }

    return channel;
  },
});


export const getChannel = query({
  handler: async (ctx) => {
    return await ctx.db.query("channels").collect();
  },
});

export const addVideos = mutation({
  args: {
    blogId: v.id("channels"),
    title: v.string(),
    description: v.optional(v.string()),
    link: v.string(),
    channel_name: v.optional(v.string()),
    pubDate: v.string(),
    image: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const postId = await ctx.db.insert("videos", {
      ...args,
      createdAt: Date.now(),
    });
    return postId;
  },
});

export const checkExistingVideo = query({
  args: { link: v.string() },

  handler: async (ctx, { link }) => {
    const existing = await ctx.db
      .query("videos")
      .withIndex("by_link", (q) => q.eq("link", link))
      .first();

    if (existing) {
      return existing; // found match
    }

    return null; // no match found
  },
});

export const checkExistingVideosBulk = query({
  args: {
    links: v.array(v.string()),
  },

  handler: async (ctx, { links }) => {
    const existsMap: Record<string, boolean> = {};

    for (const link of links) {
      const existing = await ctx.db
        .query("videos")
        .withIndex("by_link", (q) => q.eq("link", link))
        .first();

      existsMap[link] = !!existing;
    }

    return existsMap;
  },
});

export const getAllVideos = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("videos").order("desc").collect();
  },
});

export const getAllVideos50 = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("videos").order("desc").take(50);
  },
});

export const getPaginatedVideos = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("videos")
      .withIndex("by_pubDate")
      .order("desc")
      .filter((q) =>
        q.and(
          // ----------------------------
          // Condition 1: Classification must ALWAYS match one of the 3
          // ----------------------------
          q.or(
            q.eq(q.field("classification"), "Company_analysis"),
            q.eq(q.field("classification"), "Multiple_company_analysis"),
            q.eq(q.field("classification"), "Sector_analysis")
          ),

          // ----------------------------
          // Condition 2: ONE of these must be true (OR)
          // ----------------------------
          q.or(
            // has valid BSE code
            q.and(
              q.neq(q.field("bseCode"), undefined),
              q.neq(q.field("bseCode"), null),
              q.neq(q.field("bseCode"), "")
            ),

            // has valid NSE code
            q.and(
              q.neq(q.field("nseCode"), undefined),
              q.neq(q.field("nseCode"), null),
              q.neq(q.field("nseCode"), "")
            ),

            // has non-empty companyDetails
            q.and(
              q.neq(q.field("companyDetails"), undefined),
              q.neq(q.field("companyDetails"), null)
            )
          ),

          // ----------------------------
          // Condition 3: Author must be defined and non-empty
          // ----------------------------
          q.and(
            q.neq(q.field("channel_name"), undefined),
            q.neq(q.field("channel_name"), null),
            q.neq(q.field("channel_name"), ""),
            q.neq(q.field("channel_name"), "Eduinvesting Team"),
            q.neq(q.field("channel_name"), "Lalitha Diwakarla"),
            q.neq(q.field("channel_name"), "Viceroy Research")
          )
        )
      )

      .paginate(args.paginationOpts);
  },
});

export const updateVideo = mutation({
  args: {
    videoId: v.id("videos"),
    data: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      link: v.optional(v.string()),
      channel_name: v.optional(v.string()),
      pubDate: v.optional(v.string()),
      image: v.optional(v.string()),
      content: v.optional(v.string()),
      summary: v.optional(v.string()),
      companyName: v.optional(v.string()),
      bseCode: v.optional(v.string()),
      nseCode: v.optional(v.string()),
      category: v.optional(v.string()),
      classification: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      views: v.optional(v.string()),
      likes: v.optional(v.string()),
      lastCheckedAt: v.optional(v.number()),
      companyDetails: v.optional(
        v.array(
          v.object({
            company_name: v.string(),
            bse_code: v.optional(v.string()),
            nse_code: v.optional(v.string()),
            market_cap: v.optional(v.number()),
          })
        )
      ),
      tags: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      ...args.data,
      lastCheckedAt: Date.now(),
    });
  },
});

export const bulkUpdatePosts = mutation({
  args: {
    updates: v.array(
      v.object({
        postId: v.id("posts"),
        data: v.object({
          title: v.optional(v.string()),
          description: v.optional(v.string()),
          link: v.optional(v.string()),
          channel_name: v.optional(v.string()),
          pubDate: v.optional(v.string()),
          image: v.optional(v.string()),
          content: v.optional(v.string()),
          summary: v.optional(v.string()),
          companyName: v.optional(v.string()),
          bseCode: v.optional(v.string()),
          nseCode: v.optional(v.string()),
          category: v.optional(v.string()),
          classification: v.optional(v.string()),
          imageUrl: v.optional(v.string()),
          views: v.optional(v.string()),
          likes: v.optional(v.string()),
          companyDetails: v.optional(
            v.array(
              v.object({
                company_name: v.string(),
                bse_code: v.optional(v.string()),
                nse_code: v.optional(v.string()),
                market_cap: v.optional(v.number()),
              })
            )
          ),
          tags: v.optional(v.array(v.string())),
        }),
      })
    ),
  },

  handler: async (ctx, args) => {
    // Limit to avoid users sending thousands at once
    if (args.updates.length > 100) {
      throw new Error("Cannot update more than 100 posts at once");
    }

    for (const { postId, data } of args.updates) {
      await ctx.db.patch(postId, {
        ...data,
        lastCheckedAt: Date.now(),
      });
    }

    return { success: true, updated: args.updates.length };
  },
});


export const addBulkVideos = mutation({
  args: {
    videos: v.array(
      v.object({
        channelId: v.id("channels"),
        title: v.string(),
        description: v.optional(v.string()),
        link: v.string(),
        channel_name: v.optional(v.string()),
        pubDate: v.string(),
        thumbnail: v.optional(v.string()),
        content: v.optional(v.string()),
        createdAt: v.number(),
        summary: v.optional(v.string()),
        duration: v.optional(v.string()),
        companyName: v.optional(v.string()),
        bseCode: v.optional(v.string()),
        nseCode: v.optional(v.string()),
        category: v.optional(v.string()),
        companyDetails: v.optional(
          v.array(
            v.object({
              company_name: v.string(),
              bse_code: v.optional(v.string()),
              nse_code: v.optional(v.string()),
              market_cap: v.optional(v.number()),
            })
          )
        ),
        tags: v.optional(v.array(v.string())),
        classification: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        views: v.optional(v.string()),
        likes: v.optional(v.string()),
        source: v.optional(v.string()),
        lastCheckedAt: v.optional(v.number()),
      })
    ),
  },

  handler: async (ctx, args) => {
    const insertedPosts: {
      postId: Id<"videos">;
      companyNames: string[];
      channel_name?: string;
    }[] = [];

    for (const video of args.videos) {
      // -----------------------------
      // 1️⃣ Insert post
      // -----------------------------
      const videoId = await ctx.db.insert("videos", {
        ...video,
        lastCheckedAt: Date.now(),
      });
    }
    return insertedPosts;
  },
});

export const incrementClickCount = mutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.videoId);

    if (!post) {
      throw new Error("Post not found");
    }

    const currentCount = post.clickedCount ?? 0;

    await ctx.db.patch(args.videoId, {
      clickedCount: currentCount + 1,
      lastCheckedAt: Date.now(),
    });

    return { success: true, newCount: currentCount + 1 };
  },
});

export const bulkUpdateBlogs = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("blogs"),
        imageUrl: v.optional(v.string()),
        extractionMethod: v.optional(v.string()),
        feedUrl: v.optional(v.string()),
      })
    ),
  },

  handler: async (ctx, args) => {
    if (args.updates.length > 100) {
      throw new Error("Cannot update more than 100 blogs at once");
    }

    for (const { id, ...data } of args.updates) {
      await ctx.db.patch(id, {
        ...data,
        lastCheckedAt: Date.now(),
      });
    }

    return { success: true, updated: args.updates.length };
  },
});

export const getVideoById = query({
  args: { id: v.id("videos") },
  handler: async ({ db }, { id }) => {
    return await db.get(id as Id<"videos">);
  },
});
