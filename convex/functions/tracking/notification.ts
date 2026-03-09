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
    validItemId: v.id("validItems"),
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
    validItemId: v.id("validItems"),
    targetType: v.union(v.literal("company"), v.literal("author")),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const email = await ctx.runQuery(api.functions.users.getUserEmail, {
      userId: args.userId,
    });

    if (!email) return;

    const validItem = await ctx.runQuery(api.functions.validItems.getValidItemById, {
      id: args.validItemId,
    });

    if (!validItem) return;

    const author = validItem.authorName || "Unknown";

    const result = await resend.emails.send({
      to: email,
      from: "VantEdge <no-reply@thevantedge.com>",
      subject: "New post you're tracking",
      html: `
    <p>A new post was published.</p>
    <p><strong>${validItem.title}</strong></p>
    <p><strong>From: ${author}</strong></p>
    <p><strong>Company: ${validItem.companyName || "N/A"}</strong></p>
    <p>${validItem.summary || ""}</p>
    <p>
      <a href="${validItem.link}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;margin-top:8px;color:#2563eb;">
        Read full post ->
      </a>
    </p>
  `,
    });

    return result;
  },
});

export const notifyOnPostCreated = internalAction({
  args: {
    validItemId: v.id("validItems"),
    companyIds: v.array(v.string()),
    authorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userTargets: UserNotificationTargets = {};

    for (const companyId of args.companyIds) {
      const trackers = await ctx.runQuery(
        api.functions.tracking.addTracking.getTrackersByTarget,
        {
          targetType: "company",
          targetId: companyId,
        },
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

    if (args.authorId) {
      const trackers = await ctx.runQuery(
        api.functions.tracking.addTracking.getTrackersByTarget,
        {
          targetType: "author",
          targetId: args.authorId,
        },
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

    for (const [userId, targets] of Object.entries(userTargets)) {
      for (const companyId of targets.companyIds) {
        await ctx.runMutation(
          api.functions.tracking.notification.createNotification,
          {
            userId: userId as Id<"users">,
            validItemId: args.validItemId,
            targetType: "company",
            targetId: companyId,
          },
        );
        await ctx.scheduler.runAfter(
          0,
          internal.functions.tracking.notification.sendNotificationEmail,
          {
            userId: userId as Id<"users">,
            validItemId: args.validItemId,
            targetType: "company",
            targetId: companyId,
          },
        );
      }

      for (const authorId of targets.authorIds) {
        await ctx.runMutation(
          api.functions.tracking.notification.createNotification,
          {
            userId: userId as Id<"users">,
            validItemId: args.validItemId,
            targetType: "author",
            targetId: authorId,
          },
        );
        await ctx.scheduler.runAfter(
          0,
          internal.functions.tracking.notification.sendNotificationEmail,
          {
            userId: userId as Id<"users">,
            validItemId: args.validItemId,
            targetType: "author",
            targetId: authorId,
          },
        );
      }
    }
  },
});
