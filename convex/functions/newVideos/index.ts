"use node"

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../_generated/api";
import { Doc, Id } from "../../_generated/dataModel";
import { analyzeYouTubeVideo } from "./extractTranscript";
import { classifyBlog } from "../processBlogs/newTaggingAlgo/Agents/ClassificationAgent";
import { extractCompanies } from "../processBlogs/newTaggingAlgo/Agents/extractCompanies";
import { resolveWithFilter } from "../processBlogs/newTaggingAlgo/Agents/VectorDBMatcher";
import {
  Company,
  validateCompanies,
} from "../processBlogs/newTaggingAlgo/Agents/varifyCompanies";
import { summarizeBlog } from "../processBlogs/newTaggingAlgo/Agents/summarizeAgent";
import {
  getLatestVideosFromPlaylist,
  getUploadsPlaylistId,
} from "./getLatestVideos"
import { action } from "../../_generated/server";
import { v } from "convex/values";

const client = new ConvexHttpClient(
  "https://jovial-cassowary-685.convex.cloud",
);

type CompanyDetail = {
  company_name: string;
  bse_code?: string;
  nse_code?: string;
  market_cap?: number;
};

type ConvexVideo = {
  channelId: Id<"channels">;
  title: string;
  link: string;
  pubDate: string;
  channel_name: string;
  createdAt: number;
  summary?: string;
  classification?: string;
  tags?: string[];
  companyDetails?: CompanyDetail[];
  companyName?: string;
  bseCode?: string;
  duration?: string;
  nseCode?: string;
  thumbnail?: string;
  imageUrl?: string;
  views?: string;
  likes?: string;
  source: string;
  lastCheckedAt?: number;
};

/**
 * New tagging algorithm that processes a single YouTube video
 * using the improved multi-agent pipeline
 */
async function processVideoWithNewAlgorithm(
  videoUrl: string,
  videoContent: string,
) {
  console.log("🤖 Starting new tagging algorithm...");

  // AGENT 1: Classify the blog/video content
  console.log("⏳ Agent 1: Classifying content...");
  const agent1Response = await classifyBlog(videoContent);
  console.log("✅ Agent 1 Classification:", agent1Response);

  // AGENT 2: Extract companies based on classification
  console.log("⏳ Agent 2: Extracting companies...");
  const agent2Response = await extractCompanies(
    agent1Response.classification,
    videoContent,
  );
  console.log("✅ Agent 2 Extracted companies:", agent2Response);

  // AGENT 3: Resolve companies with vector DB matching
  console.log("⏳ Agent 3: Resolving with vector DB...");
  const companies = agent2Response.map((res) => res.company.toUpperCase());
  const agent3Response = await resolveWithFilter(companies);
  console.log("✅ Agent 3 Resolution:", agent3Response);

  // Filter matched companies
  const matchedCompanies: Company[] = agent3Response
    .filter((res) => res.status === "found" || res.status === "ambiguous")
    .map((res) => ({
      name: res.matchedName ?? res.inputName,
      extractedName: res.inputName,
      nse: res.nseCode,
      bse: res.bseCode,
      marketCap: res.marketCap!,
    }));

  console.log("🔍 Matched companies:", matchedCompanies);

  // AGENT 4: Validate companies against blog content
  console.log("⏳ Agent 4: Validating companies...");
  const agent4Response = await validateCompanies({
    blogContent: videoContent,
    companies: matchedCompanies,
  });
  console.log("✅ Agent 4 Validation:", agent4Response);

  // AGENT 5: Summarize the content
  console.log("⏳ Agent 5: Summarizing content...");
  const agent5Response = await summarizeBlog(videoContent);
  console.log("✅ Agent 5 Summary:", agent5Response);

  // Return structured results
  return {
    classification: agent1Response.classification,
    tags: agent5Response.tags || [],
    extractedCompanies: agent2Response,
    matchedCompanies: matchedCompanies,
    validatedCompanies: agent4Response,
    summary: agent5Response.summary || agent5Response,
  };
}

/**
 * Main function to track YouTube channel with new tagging algorithm
 */
async function runYouTubeChannelTrackingWithNewAlgorithm(
  channelId: string,
  channelName: string,
  id: Id<"channels">,
) {
  const processedVideoIds: string[] = [];
  const startTime = Date.now();

  try {
    console.log("📺 Fetching YouTube channel upload for :", channelName);
    const uploadsPlaylistId = await getUploadsPlaylistId(channelId);
    const videos = await getLatestVideosFromPlaylist(uploadsPlaylistId);

    console.log(`✅ Total videos fetched: ${videos.length}`);

    const processedLinks = new Set<string>();
    let currentBatch: ConvexVideo[] = [];
    let totalProcessed = 0;
    let batchNumber = 0;

    async function sendBatch(batch: ConvexVideo[]) {
      if (batch.length === 0) return;

      batchNumber++;
      console.log(
        `\n📤 Sending batch ${batchNumber} with ${batch.length} posts to Convex...`,
      );

      try {
        await client.mutation(api.functions.videos.addBulkVideos, {
          videos: batch,
        });
        console.log(`✅ Batch ${batchNumber} successfully inserted!`);
      } catch (err) {
        console.error(`❌ Error inserting batch ${batchNumber}:`, err);
        throw err;
      }
    }

    const existingVideos = await client.query(
      api.functions.videos.checkExistingVideosBulk,
      {
        links: videos.map(
          (v) => `https://www.youtube.com/watch?v=${v.videoId}`,
        ),
      },
    );

    // Process videos ONE AT A TIME
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];

      const exists =
        existingVideos[`https://www.youtube.com/watch?v=${video.videoId}`];

      if (exists) {
        console.log(`⚠️  Video already exists, skipping: ${video.title}`);
        continue;
      }

      try {
        const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

        console.log(
          `\n📹 Processing Video ${i + 1}/${videos.length}: ${video.title}`,
        );

        // STEP 1: Extract video transcript and details
        console.log("⏳ Step 1: Extracting video transcript...");
        const videoDetails = await analyzeYouTubeVideo(videoUrl);
        console.log("✅ Video details extracted");

        if (!videoDetails.videoContent) {
          console.warn("⚠️ No video content available, skipping...");
          continue;
        }

        // STEP 2: Process with new tagging algorithm (5 agents)
        console.log("⏳ Step 2: Running new tagging algorithm...");
        const tagResults = await processVideoWithNewAlgorithm(
          videoUrl,
          videoDetails.videoContent,
        );
        console.log("✅ Tagging complete");

        // STEP 3: Convert validated companies to CompanyDetail format

        const validatedCompanies =
          tagResults.validatedCompanies.validatedCompanies.filter(
            (result) => result.isMatch,
          );
        const companyDetails: CompanyDetail[] = validatedCompanies.map(
          (result) => ({
            company_name: result.company.name,
            bse_code: result.company.bse,
            nse_code: result.company.nse,
            market_cap: result.company.marketCap,
          }),
        );
        console.log("🔍 Final company details:", companyDetails);

        // STEP 4: Create Convex post object
        const ConvexVideo: ConvexVideo = {
          channelId: id as Id<"channels">,
          title: video.title,
          link: videoUrl,
          channel_name: channelName,
          pubDate: new Date(video.publishedAt).toISOString(),
          createdAt: Date.now(),
          thumbnail:
            video.thumbnails.maxres || video.thumbnails.high || undefined,
          summary: tagResults.summary || undefined,
          duration: video.duration || undefined,
          classification: tagResults.classification || undefined,
          tags:
            tagResults.tags && tagResults.tags.length > 0
              ? tagResults.tags
              : undefined,
          companyDetails:
            companyDetails.length > 0 ? companyDetails : undefined,
          source: "youtube",
        };

        if (companyDetails.length > 0) {
          ConvexVideo.companyName = companyDetails
            .map((c) => c.company_name)
            .join(", ");
          ConvexVideo.bseCode = companyDetails
            .map((c) => c.bse_code)
            .filter(Boolean)
            .join(", ");
          ConvexVideo.nseCode = companyDetails
            .map((c) => c.nse_code)
            .filter(Boolean)
            .join(", ");
        }

        console.log("✅ Prepared Convex Post");

        // STEP 5: Add to current batch
        currentBatch.push(ConvexVideo);
        processedLinks.add(videoUrl);
        processedVideoIds.push(video.videoId);
        totalProcessed++;

        console.log(
          `📊 Progress: ${totalProcessed} processed | Batch size: ${currentBatch.length}/100`,
        );

        // STEP 6: Send batch when it reaches 100
        if (currentBatch.length >= 100) {
          await sendBatch(currentBatch);
          currentBatch = [];
          // Pause after sending a batch
          console.log("⏸️  Pausing 5 seconds after batch send...");
        }
      } catch (err: unknown) {
        // Handle rate limit errors specifically
        if (
          err &&
          typeof err === "object" &&
          "status" in err &&
          err.status === 429
        ) {
          console.error(`🚨 RATE LIMIT HIT for video: ${video.title}`);
          console.log("⏸️  Waiting 60 seconds before continuing...");
          i--;
          continue;
        }

        console.error(`❌ Error processing video ${video.title}:`, err);
        continue;
      }
    }

    // Send remaining posts
    if (currentBatch.length > 0) {
      console.log(
        `\n📦 Sending final batch with ${currentBatch.length} posts...`,
      );
      await sendBatch(currentBatch);
      currentBatch = [];
    }

    console.log("\n🎉 All videos processed and sent!");
    console.log(`📊 Total videos processed: ${totalProcessed}`);
    console.log(`📊 Total batches sent: ${batchNumber}`);
  } catch (err) {
    console.error("❌ FATAL ERROR:", err);
  } finally {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);
    console.log("\n" + "=".repeat(60));
    console.log("📋 PROCESSING SUMMARY");
    console.log("=".repeat(60));
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log(`✅ Videos processed: ${processedVideoIds.length}`);
    console.log("\n📝 Processed Video IDs:");
    console.log(JSON.stringify(processedVideoIds, null, 2));
    console.log("=".repeat(60));
  }
}

// Run the main function
export const trackYouTubeChannels = action({
  args: {
    channelId: v.id("channels")
  },
  handler: async (ctx, args) => {
    console.log("📡 Starting YouTube Channel Tracking with New Algorithm...");
    
    // Get the specific channel
    const channel = await ctx.runQuery(api.functions.videos.getChannelById, {
      channelId: args.channelId
    });

    if (!channel) {
      console.error("❌ Channel not found");
      return;
    }

    // Process the channel
    const youtubeChannelId = channel.feedUrl.split("/channel/")[1];
    const channelName = channel.name;
    
    await runYouTubeChannelTrackingWithNewAlgorithm(
      youtubeChannelId,
      channelName,
      channel._id,
    );
    
    console.log("✅ Completed tracking YouTube channel:", channelName);
  },
});

