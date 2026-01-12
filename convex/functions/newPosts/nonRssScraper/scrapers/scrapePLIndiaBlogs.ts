"use node"

import * as cheerio from "cheerio";
import { ScrapedPost } from "../scraper/types";

export function scrapePLIndiaBlogs(
  html: string,
  baseUrl: string
): ScrapedPost[] {
  const $ = cheerio.load(html);
  const posts: ScrapedPost[] = [];
  const seen = new Set<string>();

  $(".blog-list-item").each((_, el) => {
    const card = $(el);

    const linkEl = card.find("a").first();
    const titleEl = card.find("h3").first();
    const imgEl = card.find("img").first();

    const link = linkEl.attr("href");
    const title = titleEl.text().trim();
    const image = imgEl.attr("src") || null;

    if (!link || !title) return;

    const absoluteLink = new URL(link, baseUrl).toString();
    if (seen.has(absoluteLink)) return;
    seen.add(absoluteLink);

    posts.push({
      title,
      link: absoluteLink,
      published: "",
      author: "Prabhudas Lilladher",
      image,
    });
  });

  return posts;
}
