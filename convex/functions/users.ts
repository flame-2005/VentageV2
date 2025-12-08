// convex/users.ts
import { v } from "convex/values";
import { mutation,query } from "../_generated/server";
import { Id,Doc } from "../_generated/dataModel";

// Type for mutation response
type MutationResponse = {
  success: boolean;
  message: string;
};

// Create or update user account
export const createOrUpdateUser = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        username: args.username ?? existingUser.username,
        fullName: args.fullName ?? existingUser.fullName,
        avatarUrl: args.avatarUrl ?? existingUser.avatarUrl,
      });
      return existingUser._id;
    }

    // Create new user
    const username = args.username ?? args.email.split("@")[0];
    
    const userId = await ctx.db.insert("users", {
      userId: args.userId,
      email: args.email,
      username,
      fullName: args.fullName,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
      companiesFollowing: [],
      blogWebsitesFollowing: [],
    });

    return userId;
  },
});

// Get user by Supabase user ID
export const getUserByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get user by username
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
  },
});

// Follow a company
export const followCompany = mutation({
  args: {
    userId: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args): Promise<MutationResponse> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if already following
    if (user.companiesFollowing.includes(args.companyName)) {
      return { success: false, message: "Already following this company" };
    }

    await ctx.db.patch(user._id, {
      companiesFollowing: [...user.companiesFollowing, args.companyName],
    });

    return { success: true, message: "Company followed successfully" };
  },
});

// Unfollow a company
export const unfollowCompany = mutation({
  args: {
    userId: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args): Promise<MutationResponse> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      companiesFollowing: user.companiesFollowing.filter(
        (company) => company !== args.companyName
      ),
    });

    return { success: true, message: "Company unfollowed successfully" };
  },
});

// Follow a blog website
export const followBlogWebsite = mutation({
  args: {
    userId: v.string(),
    blogUrl: v.string(),
  },
  handler: async (ctx, args): Promise<MutationResponse> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if already following
    if (user.blogWebsitesFollowing.includes(args.blogUrl)) {
      return { success: false, message: "Already following this blog" };
    }

    await ctx.db.patch(user._id, {
      blogWebsitesFollowing: [...user.blogWebsitesFollowing, args.blogUrl],
    });

    return { success: true, message: "Blog website followed successfully" };
  },
});
// Unfollow a blog website
export const unfollowBlogWebsite = mutation({
  args: {
    userId: v.string(),
    blogUrl: v.string(),
  },
  handler: async (ctx, args): Promise<MutationResponse> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      blogWebsitesFollowing: user.blogWebsitesFollowing.filter(
        (blog) => blog !== args.blogUrl
      ),
    });

    return { success: true, message: "Blog website unfollowed successfully" };
  },
});

// Get all companies a user is following
export const getUserFollowedCompanies = query({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<string[]> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return user?.companiesFollowing ?? [];
  },
});

// Get all blog websites a user is following
export const getUserFollowedBlogs = query({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<string[]> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return user?.blogWebsitesFollowing ?? [];
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    userId: v.string(),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<MutationResponse> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const updateData: Partial<Doc<"users">> = {};
    if (args.username !== undefined) updateData.username = args.username;
    if (args.fullName !== undefined) updateData.fullName = args.fullName;
    if (args.avatarUrl !== undefined) updateData.avatarUrl = args.avatarUrl;

    await ctx.db.patch(user._id, updateData);

    return { success: true, message: "Profile updated successfully" };
  },
});

// Delete user account
export const deleteUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<MutationResponse> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.delete(user._id);
    return { success: true, message: "User deleted successfully" };
  },
});

// Get all users (for admin purposes)
export const getAllUsers = query({
  handler: async (ctx): Promise<Doc<"users">[]> => {
    return await ctx.db.query("users").collect();
  },
});

// Check if user is following a company
export const isFollowingCompany = query({
  args: {
    userId: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) return false;

    return user.companiesFollowing.includes(args.companyName);
  },
});

// Check if user is following a blog
export const isFollowingBlog = query({
  args: {
    userId: v.string(),
    blogUrl: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) return false;

    return user.blogWebsitesFollowing.includes(args.blogUrl);
  },
});