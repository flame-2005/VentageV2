import { api } from "../../_generated/api";
import { internalAction, mutation } from "../../_generated/server";

// 1. Mutation to trigger tracking for all channels
export const triggerAllChannelTracking = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🚀 Triggering tracking for all YouTube channels...");
    
    // Get all channels
    const channels = await ctx.db.query("channels").collect();
    
    // Schedule tracking for each channel
    for (const channel of channels) {
      await ctx.scheduler.runAfter(
        0, // Run immediately
        api.functions.newVideos.index.trackYouTubeChannels,
        { channelId: channel._id }
      );
    }
    
    console.log(`✅ Scheduled tracking for ${channels.length} channels`);
    return { scheduledCount: channels.length };
  },
});

// 2. Cron function to automatically track all channels periodically
export const cronTrackYouTubeChannels = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("⏰ Cron: Starting scheduled YouTube channel tracking...");
    
    // Get all channels
    const channels = await ctx.runQuery(api.functions.videos.getChannel);
    
    // Schedule tracking for each channel with staggered delays
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      const delay = i * 5000; // Stagger by 5 seconds each to avoid rate limits
      
      await ctx.scheduler.runAfter(
        delay,
        api.functions.newVideos.index.trackYouTubeChannels,
        { channelId: channel._id }
      );
    }
    
    console.log(`⏰ Cron: Scheduled tracking for ${channels.length} channels`);
  },
});