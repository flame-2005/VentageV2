import { fetchHtml } from "./fetchHTML";
import { extractPostsFromHTML_AI } from "./extractPostsFromHTML";

export async function crawlHistoricalPosts(
  baseUrl: string,
  maxPages = 20
) {
  const allPosts = [];

  for (let page = 1; page <= maxPages; page++) {
    const url =
      page === 1 ? baseUrl : `${baseUrl}/page/${page}`;

    const html = await fetchHtml(url);
    if (!html) break;

    const posts = await extractPostsFromHTML_AI(html, url);
    if (posts.length === 0) break;

    allPosts.push(...posts);
  }

  return allPosts;
}
