"use node"

import axios from "axios";

const API_KEY = process.env.YOUTUBE_API_KEY;

interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface Thumbnails {
  default?: Thumbnail;
  medium?: Thumbnail;
  high?: Thumbnail;
  standard?: Thumbnail;
  maxres?: Thumbnail;
}

/**
 * Step 1: Get uploads playlist ID
 */
export async function getUploadsPlaylistId(channelId: string): Promise<string> {
  const url = "https://www.googleapis.com/youtube/v3/channels";

  const res = await axios.get(url, {
    params: {
      part: "contentDetails",
      id: channelId,
      key: API_KEY,
    },
  });

  const uploadsPlaylistId =
    res.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error("Uploads playlist not found");
  }

  return uploadsPlaylistId;
}

async function getVideoDurations(videoIds: string[]) {
  const res = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
    params: {
      part: "contentDetails",
      id: videoIds.join(","),
      key: API_KEY,
    },
  });

  const durationMap: Record<string, string> = {};

  for (const item of res.data.items) {
    durationMap[item.id] = item.contentDetails.duration; // ISO 8601
  }

  return durationMap;
}

/**
 * Step 2: Get all videos from uploads playlist
 */
function isoDurationToSeconds(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

export async function getLatestVideosFromPlaylist(
  playlistId: string,
  limit = 10,
) {
  const videos: {
    videoId: string;
    title: string;
    description: string;
    publishedAt: string;
    duration: string;
    thumbnails: {
      default?: string;
      medium?: string;
      high?: string;
      standard?: string;
      maxres?: string;
    };
  }[] = [];

  const res = await axios.get(
    "https://www.googleapis.com/youtube/v3/playlistItems",
    {
      params: {
        part: "snippet,status",
        playlistId,
        maxResults: 50, // fetch one page only
        key: API_KEY,
      },
    },
  );

  const videoMetaMap: Record<
    string,
    {
      title: string;
      description: string;
      publishedAt: string;
      thumbnails: Thumbnails;
    }
  > = {};

  const batchVideoIds: string[] = [];

  // 1️⃣ Collect valid public videos
  for (const item of res.data.items) {
    if (videos.length >= limit) break;

    const snippet = item.snippet;
    const status = item.status;

    if (!snippet?.resourceId?.videoId) continue;
    if (status?.privacyStatus !== "public") continue;
    if (snippet.title === "Deleted video" || snippet.title === "Private video")
      continue;

    const videoId = snippet.resourceId.videoId;

    batchVideoIds.push(videoId);
    videoMetaMap[videoId] = {
      title: snippet.title,
      description: snippet.description,
      publishedAt: snippet.publishedAt,
      thumbnails: snippet.thumbnails,
    };
  }

  // 2️⃣ Fetch durations
  if (batchVideoIds.length) {
    const durationMap = await getVideoDurations(batchVideoIds);

    for (const videoId of batchVideoIds) {
      if (videos.length >= limit) break;

      const isoDuration = durationMap[videoId];
      if (!isoDuration) continue;

      const durationInSeconds = isoDurationToSeconds(isoDuration);

      // ❌ Skip Shorts
      if (durationInSeconds < 60) continue;

      const meta = videoMetaMap[videoId];

      videos.push({
        videoId,
        title: meta.title,
        description: meta.description,
        publishedAt: meta.publishedAt,
        duration: isoDuration,
        thumbnails: {
          default: meta.thumbnails?.default?.url,
          medium: meta.thumbnails?.medium?.url,
          high: meta.thumbnails?.high?.url,
          standard: meta.thumbnails?.standard?.url,
          maxres: meta.thumbnails?.maxres?.url,
        },
      });
    }
  }

  console.log(`📰 Feed videos count: ${videos.length}`);
  return videos;
}
