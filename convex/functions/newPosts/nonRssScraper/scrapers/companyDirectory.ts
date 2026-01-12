"use node"

import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { ScrapedPost } from "../scraper/types";

export function scrapeCompanyDirectory(
  html: string,
  baseUrl: string
): Omit<ScrapedPost, "image">[] {
  const $: CheerioAPI = cheerio.load(html);
  const posts: Omit<ScrapedPost, "image">[] = [];

  $("#india .company-card").each((_, el) => {
    const card = $(el);

    const linkEl = card.find("a").first();
    const nameEl = card.find(".company-name.name");

    const title = nameEl.clone().children().remove().end().text().trim();
    const symbol =
      nameEl.find(".company-symbol-meta").text().trim() ||
      card.attr("data-symbol") ||
      "";

    const href = linkEl.attr("href");
    if (!title || !href) return;

    posts.push({
      title: symbol ? `${title} (${symbol})` : title,
      link: new URL(href, baseUrl).toString(),

      // These pages don’t have dates/authors → normalize
      published: "",
      author: "System",
    });
  });

  return posts;
}
