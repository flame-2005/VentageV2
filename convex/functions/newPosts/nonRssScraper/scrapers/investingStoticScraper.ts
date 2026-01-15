'use node'

import * as cheerio from "cheerio";
import { ScrapedPost } from "./scrapeAlphaStreetTranscripts";

type scrapeInvestingStoicsProps = {
  startUrl: string;
};

export async function scrapeInvestingStoicsBlog(
  props: scrapeInvestingStoicsProps
): Promise<ScrapedPost[]> {
  const START_URL = props.startUrl;

  console.log("[fetch] loading:", START_URL);

  const res = await fetch(START_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    },
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  console.log("[scrape] extracting posts");

  const posts: ScrapedPost[] = [];

  $("div.gallery-item-container").each((_, el) => {
    const title = $(el).find("h2.bD0vt9").text().trim();

    let link = $(el).find("a[href*='/post/']").attr("href") || "";
    if (link && link.startsWith("/")) {
      link = new URL(link, START_URL).href;
    }

    const image =
      $(el)
        .find("img[data-hook='gallery-item-image-img']")
        .attr("src") || null;

    const published =
      $(el)
        .find("span[data-hook='time-ago']")
        .text()
        .trim() || "";

    if (!title || !link) return;

    posts.push({
      title,
      link,
      image,
      published,
      author: "InvestingStoics",
      excerpt: "",
    });
  });

  console.log("[result] total exported:", posts.length);
  return posts;
}
