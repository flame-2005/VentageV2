"use node"

import * as cheerio from "cheerio";
import { ScrapedPost } from "../scraper/types";

export interface StaticPostListOptions {
  itemSelector: string;     // selector for one post card
  linkSelector?: string;    // inside item (optional)
  titleSelector: string;    // inside item
  imageSelector?: string;   // inside item (optional)
  authorSelector?: string;  // inside item (optional)
  dateSelector?: string;    // inside item (optional)
}

export function scrapeStaticPostList(
  html: string,
  baseUrl: string,
  options: StaticPostListOptions
): ScrapedPost[] {
  const {
    itemSelector,
    linkSelector,
    titleSelector,
    imageSelector,
    authorSelector,
    dateSelector,
  } = options;

  const $ = cheerio.load(html);
  const posts: ScrapedPost[] = [];
  const seen = new Set<string>();

  $(itemSelector).each((_, el) => {
    const item = $(el);

    const linkEl = linkSelector
      ? item.find(linkSelector).first()
      : item.find("a").first();

    const titleEl = item.find(titleSelector).first();
    const imageEl = imageSelector
      ? item.find(imageSelector).first()
      : null;

    const link = linkEl.attr("href");
    const title = titleEl.text().trim();
    const image = imageEl ? imageEl.attr("src") || null : null;

    if (!link || !title) return;

    const absoluteLink = new URL(link, baseUrl).toString();
    if (seen.has(absoluteLink)) return;
    seen.add(absoluteLink);

    const author = item.find(authorSelector).text().trim();

    const published = dateSelector
      ? item.find(dateSelector).text().trim()
      : "";

    posts.push({
      title,
      link: absoluteLink,
      published,
      author,
      image,
    });
  });

  return posts;
}
