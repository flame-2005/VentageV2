import { v } from "convex/values";
import { internalAction, mutation } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type UserNotificationTargets = {
  [userId: string]: {
    companyIds: Set<string>;
    authorIds: Set<string>;
  };
};

export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
    targetType: v.union(v.literal("company"), v.literal("author")),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      ...args,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

export const sendNotificationEmail = internalAction({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
    targetType: v.union(v.literal("company"), v.literal("author")),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1️⃣ Get user email
    const email = await ctx.runQuery(api.functions.users.getUserEmail, {
      userId: args.userId,
    });

    if (!email) return;

    // 2️⃣ Get post details (optional but recommended)
    const post = await ctx.runQuery(api.functions.substackBlogs.getPostById, {
      id: args.postId,
    });

    // 3️⃣ Send email via Resend
    const result = await resend.emails.send({
      to: email,
      from: "VentEdge <no-reply@thevantedge.com>",
      subject: "New post you’re tracking",
      html: `
    <p>A new post was published.</p>
    <p><strong>${post?.title}</strong></p>
    <p>${post?.summary}</p>
    <p>
      <a href="${post?.link}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;margin-top:8px;color:#2563eb;">
        Read full post →
      </a>
    </p>
  `,
    });

    return result;
  },
});

export const notifyOnPostCreated = internalAction({
  args: {
    postId: v.id("posts"),
    companyIds: v.array(v.string()),
    authorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userTargets: UserNotificationTargets = {};

    // companies
    for (const companyId of args.companyIds) {
      const trackers = await ctx.runQuery(
        api.functions.tracking.addTracking.getTrackersByTarget,
        {
          targetType: "company",
          targetId: companyId,
        }
      );

      for (const t of trackers) {
        if (!userTargets[t.userId]) {
          userTargets[t.userId] = {
            companyIds: new Set(),
            authorIds: new Set(),
          };
        }

        userTargets[t.userId].companyIds.add(companyId);
      }
    }

    // author
    if (args.authorId) {
      const trackers = await ctx.runQuery(
        api.functions.tracking.addTracking.getTrackersByTarget,
        {
          targetType: "author",
          targetId: args.authorId,
        }
      );

      for (const t of trackers) {
        if (!userTargets[t.userId]) {
          userTargets[t.userId] = {
            companyIds: new Set(),
            authorIds: new Set(),
          };
        }

        userTargets[t.userId].authorIds.add(args.authorId);
      }
    }

    // fan-out
    for (const [userId, targets] of Object.entries(userTargets)) {
      // company-triggered notifications
      for (const companyId of targets.companyIds) {
        await ctx.runMutation(
          api.functions.tracking.notification.createNotification,
          {
            userId: userId as Id<"users">,
            postId: args.postId,
            targetType: "company",
            targetId: companyId,
          }
        );
        await ctx.scheduler.runAfter(
          0,
          internal.functions.tracking.notification.sendNotificationEmail,
          {
            userId: userId as Id<"users">,
            postId: args.postId,
            targetType: "company",
            targetId: companyId,
          }
        );
      }

      // author-triggered notifications
      for (const authorId of targets.authorIds) {
        await ctx.runMutation(
          api.functions.tracking.notification.createNotification,
          {
            userId: userId as Id<"users">,
            postId: args.postId,
            targetType: "author",
            targetId: authorId,
          }
        );
        await ctx.scheduler.runAfter(
          0,
          internal.functions.tracking.notification.sendNotificationEmail,
          {
            userId: userId as Id<"users">,
            postId: args.postId,
            targetType: "author",
            targetId: authorId,
          }
        );
      }
    }
  },
});
