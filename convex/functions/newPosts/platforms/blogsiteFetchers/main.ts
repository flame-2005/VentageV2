"use node"

import { extractPostsFromHTML_AI } from "./extractPostsFromHTML";
import { extractRSSLinks } from "./extractRss";
import { fetchHtml } from "./fetchHTML";
import { getPostsFromRSS } from "./getPostsFromRss";
import { crawlHistoricalPosts } from "./paginatedCrawler";

export async function getAllPosts(url: string) {
  const html = await fetchHtml(url);

  // 1. Try to extract feeds
  const rssCandidates = extractRSSLinks(html, url);

  // 2. Try RSS first
  for (const feedUrl of rssCandidates) {
    console.log("Trying RSS feed:", feedUrl);
    const posts = await getPostsFromRSS(feedUrl);
    if (posts.length > 0) {
      // RSS is incomplete → also fetch older posts via crawling
      // const historical = await crawlHistoricalPosts(url);
      return [...posts];
    }
  }

  // 3. No RSS → use AI to extract from homepage
  console.log("No RSS found, using AI to extract from homepage");
  const homepagePosts = await extractPostsFromHTML_AI(html, url);

  // 4. Try crawling deeper pages to get historical posts
  // console.log("Crawling historical posts...");
  // const historical = await crawlHistoricalPosts(url);

  return [...homepagePosts];
}
