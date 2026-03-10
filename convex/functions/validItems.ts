// convex/feed.ts

import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { isValidAuthor } from "../helper/post";

export const getFeedItems = query({
  args: {
    paginationOpts: paginationOptsValidator,
    userId: v.optional(v.id("users")),
  },

  handler: async (ctx, args) => {
    // 1️⃣ Get paginated items
    const feed = await ctx.db
      .query("validItems")
      .withIndex("by_pubDate")
      .order("desc")
      .paginate(args.paginationOpts);

    // If no user → return directly
    if (!args.userId) {
      return {
        ...feed,
        page: feed.page.map((item) => ({
          ...item,
          isBookmarked: false,
        })),
      };
    }

    // 2️⃣ Get all bookmarks for user
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId!))
      .collect();

    const bookmarkedIds = new Set(bookmarks.map((b) => b.itemId.toString()));

    // 3️⃣ Merge bookmark state into feed
    return {
      ...feed,
      page: feed.page.map((item) => ({
        ...item,
        isBookmarked: bookmarkedIds.has(item._id.toString()),
      })),
    };
  },
});

export const getFeedByType = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sourceType: v.optional(
      v.union(v.literal("post"), v.literal("video"), v.literal("tweet")),
    ),
    userId: v.optional(v.id("users")),
  },

  handler: async (ctx, args) => {
    const { sourceType, userId } = args;

    // 1️⃣ Get paginated feed
    const feed =
      sourceType !== undefined
        ? await ctx.db
            .query("validItems")
            .withIndex("by_sourceType_pubDate", (q) =>
              q.eq("sourceType", sourceType),
            )
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("validItems")
            .withIndex("by_pubDate")
            .order("desc")
            .paginate(args.paginationOpts);

    // 2️⃣ If no user → return directly
    if (!userId) {
      return {
        ...feed,
        page: feed.page.map((item) => ({
          ...item,
          isBookmarked: false,
        })),
      };
    }

    // 3️⃣ Fetch bookmarks ONLY for items in this page (enterprise optimization)
    const pageIds = feed.page.map((item) => item._id);

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const bookmarkedSet = new Set(
      bookmarks
        .filter((b) => pageIds.includes(b.itemId))
        .map((b) => b.itemId.toString()),
    );

    // 4️⃣ Merge bookmark state
    return {
      ...feed,
      page: feed.page.map((item) => ({
        ...item,
        isBookmarked: bookmarkedSet.has(item._id.toString()),
      })),
    };
  },
});

export const bulkInsertValidItems = mutation({
  args: {
    items: v.array(
      v.object({
        sourceType: v.union(
          v.literal("post"),
          v.literal("video"),
          v.literal("tweet"),
        ),
        itemId: v.string(),
        sourceId: v.optional(v.string()),
        title: v.string(),
        link: v.string(),
        authorName: v.string(),
        pubDate: v.string(),
        createdAt: v.number(),
        summary: v.string(),
        imageUrl: v.optional(v.string()),
        thumbnail: v.optional(v.string()),
        duration: v.optional(v.string()),
        companyName: v.string(),
        bseCode: v.optional(v.string()),
        nseCode: v.optional(v.string()),
        companyDetails: v.array(
          v.object({
            company_name: v.string(),
            bse_code: v.optional(v.string()),
            nse_code: v.optional(v.string()),
            market_cap: v.optional(v.number()),
          }),
        ),
        classification: v.string(),
        tags: v.array(v.string()),
        source: v.string(),
      }),
    ),
  },

  handler: async (ctx, args) => {
    if (args.items.length > 100) {
      throw new Error("Maximum 100 items allowed per batch.");
    }

    const insertedIds: {
      itemsId: Id<"validItems">;
      companyNames: string[];
      author?: string;
    }[] = [];

    for (const post of args.items) {
      // -----------------------------
      // 1️⃣ Insert post
      // -----------------------------
      const itemId = await ctx.db.insert("validItems", {
        ...post,
        lastCheckedAt: Date.now(),
      });

      // -----------------------------
      // 2️⃣ Extract company names
      // -----------------------------
      let companyNames: string[] = [];

      if (post.companyDetails && post.companyDetails.length > 0) {
        companyNames = post.companyDetails.map((c) => c.company_name.trim());
      }

      // -----------------------------
      // 3️⃣ Insert into companyPosts
      // -----------------------------
      for (const companyName of companyNames) {
        const existing = await ctx.db
          .query("companyValidItems")
          .withIndex("by_company_itemsId", (q) =>
            q.eq("companyName", companyName).eq("itemsId", itemId),
          )
          .unique();

        if (!existing) {
          await ctx.db.insert("companyValidItems", {
            companyName,
            sourceType: post.sourceType,
            itemsId: itemId,
            pubDate: post.pubDate,
          });
        }
      }

      // -----------------------------
      // 4️⃣ Collect return payload
      // -----------------------------
      insertedIds.push({
        itemsId: itemId,
        companyNames,
        author: post.authorName,
      });
    }

    return {
      insertedCount: insertedIds.length,
      insertedIds,
    };
  },
});

export const insertValidItemBySourceId = mutation({
  args: {
    postId: v.optional(v.id("posts")),
    videoId: v.optional(v.id("videos")),
  },
  handler: async (ctx, args) => {
    const hasPostId = !!args.postId;
    const hasVideoId = !!args.videoId;

    if ((hasPostId && hasVideoId) || (!hasPostId && !hasVideoId)) {
      throw new Error("Pass exactly one of postId or videoId.");
    }

    if (args.postId) {
      const post = await ctx.db.get(args.postId);
      if (!post) throw new Error("Post not found");

      const existing = await ctx.db
        .query("validItems")
        .withIndex("by_itemId", (q) => q.eq("itemId", post._id))
        .first();

      if (existing) {
        return { success: true, alreadyExists: true, itemId: existing._id };
      }

      const itemId = await ctx.db.insert("validItems", {
        sourceType: "post",
        itemId: post._id,
        sourceId: post.blogId,
        title: post.title,
        summary: post.summary ?? "",
        link: post.link,
        authorName: post.author ?? "Unknown",
        pubDate: post.pubDate,
        imageUrl: post.imageUrl,
        companyName: post.companyName ?? "",
        bseCode: post.bseCode,
        nseCode: post.nseCode,
        companyDetails: post.companyDetails ?? [],
        createdAt: post.createdAt,
        clickedCount: post.clickedCount,
        usersLiked: post.usersLiked,
        shareCount: post.shareCount,
        usersShared: post.usersShared,
        thumbnail: post.image,
        classification: post.classification ?? "",
        tags: post.tags ?? [],
        source: post.source ?? "unknown",
        lastCheckedAt: Date.now(),
      });

      const companyNames = (post.companyDetails ?? [])
        .map((c) => c.company_name.trim())
        .filter(Boolean);

      for (const companyName of companyNames) {
        const relationExists = await ctx.db
          .query("companyValidItems")
          .withIndex("by_company_itemsId", (q) =>
            q.eq("companyName", companyName).eq("itemsId", itemId),
          )
          .unique();

        if (!relationExists) {
          await ctx.db.insert("companyValidItems", {
            itemsId: itemId,
            sourceType: "post",
            companyName,
            pubDate: post.pubDate,
          });
        }
      }

      return { success: true, alreadyExists: false, itemId };
    }

    const video = await ctx.db.get(args.videoId!);
    if (!video) throw new Error("Video not found");

    const existing = await ctx.db
      .query("validItems")
      .withIndex("by_itemId", (q) => q.eq("itemId", video._id))
      .first();

    if (existing) {
      return { success: true, alreadyExists: true, itemId: existing._id };
    }

    const itemId = await ctx.db.insert("validItems", {
      sourceType: "video",
      itemId: video._id,
      sourceId: video.channelId,
      title: video.title,
      summary: video.summary ?? "",
      link: video.link,
      authorName: video.channel_name ?? "Unknown",
      pubDate: video.pubDate,
      imageUrl: video.imageUrl,
      companyName: video.companyName ?? "",
      bseCode: video.bseCode,
      nseCode: video.nseCode,
      companyDetails: video.companyDetails ?? [],
      createdAt: video.createdAt,
      clickedCount: video.clickedCount,
      usersLiked: video.usersLiked,
      shareCount: video.shareCount,
      usersShared: video.usersShared,
      thumbnail: video.thumbnail,
      duration: video.duration,
      classification: video.classification ?? "",
      tags: video.tags ?? [],
      source: video.source ?? "unknown",
      lastCheckedAt: Date.now(),
    });

    const companyNames = (video.companyDetails ?? [])
      .map((c) => c.company_name.trim())
      .filter(Boolean);

    for (const companyName of companyNames) {
      const relationExists = await ctx.db
        .query("companyValidItems")
        .withIndex("by_company_itemsId", (q) =>
          q.eq("companyName", companyName).eq("itemsId", itemId),
        )
        .unique();

      if (!relationExists) {
        await ctx.db.insert("companyValidItems", {
          itemsId: itemId,
          sourceType: "video",
          companyName,
          pubDate: video.pubDate,
        });
      }
    }

    return { success: true, alreadyExists: false, itemId };
  },
});

export const incrementClickCount = mutation({
  args: {
    validItemId: v.id("validItems"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.validItemId);

    if (!post) {
      throw new Error("Post not found");
    }

    const currentCount = post.clickedCount ?? 0;

    await ctx.db.patch(args.validItemId, {
      clickedCount: currentCount + 1,
    });

    return { success: true, newCount: currentCount + 1 };
  },
});

export const getValidItemsByAuthor = query({
  args: {
    authorName: v.string(),
    paginationOpts: paginationOptsValidator,
    sourceType: v.optional(
      v.union(v.literal("post"), v.literal("video"), v.literal("tweet")),
    ),
    userId: v.optional(v.id("users")), // ✅ Added
  },

  handler: async (ctx, args) => {
    const { authorName, paginationOpts, sourceType, userId } = args;

    // 1️⃣ Get paginated items
    const feed =
      sourceType !== undefined
        ? await ctx.db
            .query("validItems")
            .withIndex("by_authorName_sourceType_pubDate", (q) =>
              q.eq("authorName", authorName).eq("sourceType", sourceType),
            )
            .order("desc")
            .paginate(paginationOpts)
        : await ctx.db
            .query("validItems")
            .withIndex("by_authorName_pubDate", (q) =>
              q.eq("authorName", authorName),
            )
            .order("desc")
            .paginate(paginationOpts);

    // 2️⃣ If no user → return directly
    if (!userId) {
      return {
        ...feed,
        page: feed.page.map((item) => ({
          ...item,
          isBookmarked: false,
        })),
      };
    }

    // 3️⃣ Only check bookmarks for current page items (efficient)
    const pageIds = feed.page.map((item) => item._id);

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const bookmarkedSet = new Set(
      bookmarks
        .filter((b) => pageIds.includes(b.itemId))
        .map((b) => b.itemId.toString()),
    );

    // 4️⃣ Merge bookmark state
    return {
      ...feed,
      page: feed.page.map((item) => ({
        ...item,
        isBookmarked: bookmarkedSet.has(item._id.toString()),
      })),
    };
  },
});

export const getValidItemsByCompany = query({
  args: {
    companyName: v.string(),
    paginationOpts: paginationOptsValidator,
    sourceType: v.optional(
      v.union(v.literal("post"), v.literal("video"), v.literal("tweet")),
    ),
    userId: v.optional(v.id("users")),
  },

  handler: async (ctx, args) => {
    const { companyName, paginationOpts, sourceType, userId } = args;

    // 1️⃣ Use correct index based on sourceType
    const companyPostPage =
      sourceType !== undefined
        ? await ctx.db
            .query("companyValidItems")
            .withIndex("by_company_sourceType_pubDate", (q) =>
              q.eq("companyName", companyName).eq("sourceType", sourceType),
            )
            .order("desc")
            .paginate(paginationOpts)
        : await ctx.db
            .query("companyValidItems")
            .withIndex("by_company_pubDate", (q) =>
              q.eq("companyName", companyName),
            )
            .order("desc")
            .paginate(paginationOpts);

    // 2️⃣ Extract post IDs
    const postIds = companyPostPage.page.map((cp) => cp.itemsId);

    // 3️⃣ Fetch actual posts
    const posts = await Promise.all(
      postIds.map((postId) => ctx.db.get(postId)),
    );

    const validPosts = posts.filter(
      (post): post is Doc<"validItems"> => post !== null,
    );

    // 4️⃣ If no user → return directly
    if (!userId) {
      return {
        ...companyPostPage,
        page: validPosts.map((item) => ({
          ...item,
          isBookmarked: false,
        })),
      };
    }

    // 5️⃣ Fetch bookmarks ONLY for this page
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const bookmarkedSet = new Set(
      bookmarks
        .filter((b) => postIds.includes(b.itemId))
        .map((b) => b.itemId.toString()),
    );

    // 6️⃣ Merge bookmark state
    return {
      ...companyPostPage,
      page: validPosts.map((item) => ({
        ...item,
        isBookmarked: bookmarkedSet.has(item._id.toString()),
      })),
    };
  },
});

export const getValidPostsByCompany = query({
  args: {
    companyName: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { companyName, paginationOpts }) => {
    const companyPostPage = await ctx.db
      .query("companyValidItems")
      .withIndex("by_company_sourceType_pubDate", (q) =>
        q.eq("companyName", companyName).eq("sourceType", "post"),
      )
      .order("desc")
      .paginate(paginationOpts);

    const postIds = [...new Set(companyPostPage.page.map((cp) => cp.itemsId))];

    const posts = await Promise.all(
      postIds.map((postId) => ctx.db.get(postId)),
    );

    const filteredPosts = posts.filter(
      (post): post is Doc<"validItems"> => post !== null,
    );

    return {
      ...companyPostPage,
      page: filteredPosts,
    };
  },
});

export const getValidVideosByCompany = query({
  args: {
    companyName: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { companyName, paginationOpts }) => {
    const companyVideoPage = await ctx.db
      .query("companyValidItems")
      .withIndex("by_company_sourceType_pubDate", (q) =>
        q.eq("companyName", companyName).eq("sourceType", "video"),
      )
      .order("desc")
      .paginate(paginationOpts);

    const videoIds = [
      ...new Set(companyVideoPage.page.map((cp) => cp.itemsId)),
    ];

    const videos = await Promise.all(
      videoIds.map((videoId) => ctx.db.get(videoId)),
    );
    const filteredVideos = videos.filter(
      (video): video is Doc<"validItems"> => video !== null,
    );

    return {
      ...companyVideoPage,
      page: filteredVideos,
    };
  },
});

export const getValidItemById = query({
  args: {
    id: v.id("validItems"),
  },
  handler: async ({ db }, { id }) => {
    return await db.get(id);
  },
});

export const toggleBookmark = mutation({
  args: {
    itemId: v.id("validItems"),
    userId: v.string(),
    itemPubDate: v.string(),
  },

  handler: async (ctx, { itemId, userId, itemPubDate }) => {
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", userId).eq("itemId", itemId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { status: "removed" };
    }

    await ctx.db.insert("bookmarks", {
      userId,
      itemId,
      createdAt: Date.now(),
      itemPubDate: itemPubDate,
    });

    return { status: "added" };
  },
});

export const getUserBookmarks = query({
  args: {
    userId: v.id("users"),
    paginationOpts: paginationOptsValidator,
  },

  handler: async (ctx, args) => {
    const { userId, paginationOpts } = args;

    // 1️⃣ Paginate bookmarks (newest first)
    const bookmarkPage = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_pubDate", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(paginationOpts);

    // 2️⃣ Get validItems for current page
    const postIds = bookmarkPage.page.map((b) => b.itemId);

    const posts = await Promise.all(postIds.map((id) => ctx.db.get(id)));

    const validPosts = posts.filter(
      (post): post is Doc<"validItems"> => post !== null,
    );

    // 3️⃣ Attach isBookmarked = true (since this IS bookmark page)
    return {
      ...bookmarkPage,
      page: validPosts.map((item) => ({
        ...item,
        isBookmarked: true,
      })),
    };
  },
});

export const getAuthorSuggestions = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, { searchTerm }) => {
    if (!searchTerm || !searchTerm.trim()) {
      return [];
    }

    const term = searchTerm.trim();
    const lowerTerm = term.toLowerCase();

    // 1️⃣ Fuzzy author search (typo-tolerant)
    const authorResults = await ctx.db
      .query("validItems")
      .withSearchIndex("search_author", (q) => q.search("authorName", term))
      .collect();

    // 2️⃣ Exact match on author index
    const exactResults = await ctx.db
      .query("validItems")
      .withIndex("by_authorName_pubDate", (q) => q.eq("authorName", term))
      .take(5);

    // 3️⃣ Merge & dedupe by author name + sourceType
    const seenAuthors = new Set<string>();
    const uniqueAuthors = [...exactResults, ...authorResults]
      .filter((post) => {
        if (!post.authorName) return false;
        const authorKey = `${post.authorName.toLowerCase()}::${post.sourceType}`; // 👈 changed
        if (seenAuthors.has(authorKey)) return false;
        seenAuthors.add(authorKey);
        return true;
      })
      .map((post) => ({
        author: post.authorName,
        sourceType: post.sourceType,
        authorLower: post.authorName.toLowerCase(),
      }));

    // 4️⃣ Relevance sorting
    const sorted = uniqueAuthors.sort((a, b) => {
      const aLower = a.authorLower;
      const bLower = b.authorLower;

      const aExact = aLower === lowerTerm;
      const bExact = bLower === lowerTerm;

      const aStarts = aLower.startsWith(lowerTerm);
      const bStarts = bLower.startsWith(lowerTerm);

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return a.author.localeCompare(b.author);
    });

    // 5️⃣ Final response
    return sorted.slice(0, 10).map((author) => ({
      author: author.author,
      sourceType: author.sourceType,
    }));
  },
});
