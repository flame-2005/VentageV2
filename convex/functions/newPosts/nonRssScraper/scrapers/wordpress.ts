"use node"

import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { ScrapedPost } from "../scraper/types";

export function scrapeWordpressListing(
  html: string,
  baseUrl: string
): Omit<ScrapedPost, "image">[] {
  const $: CheerioAPI = cheerio.load(html);
  const posts: Omit<ScrapedPost, "image">[] = [];

  $("article[type-post], article.post").each((_, el) => {
    const titleEl = $(el).find("h1.entry-title a");
    const timeEl = $(el).find("time.entry-date.published");
    const authorEl = $(el).find(".author.vcard a");

    const title = titleEl.text().trim();
    const link = titleEl.attr("href");
    const published = timeEl.text().trim();
    const author = authorEl.text().trim();

    if (!title || !link) return;

    posts.push({
      title,
      link: new URL(link, baseUrl).toString(),
      published,
      author,
    });
  });

  return posts;
}
