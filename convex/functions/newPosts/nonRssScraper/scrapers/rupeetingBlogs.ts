"use node"

import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapedPost } from "./scrapeAlphaStreetTranscripts";
import type { Element } from "domhandler";

/* =======================
   Types
======================= */

type ScrapeRupeetingProps = {
  BaseUrl: string;
};

/* =======================
   Image Helpers
======================= */

async function extractImageFallback(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const og = $('meta[property="og:image"]').attr("content");
    if (og) return og;

    const tw = $('meta[name="twitter:image"]').attr("content");
    if (tw) return tw;

    const articleImg = $("article img").first().attr("src");
    if (articleImg) return articleImg;

    const anyImg = $("img").first().attr("src");
    return anyImg || null;
  } catch {
    return null;
  }
}

async function resolveImage(
  $: cheerio.CheerioAPI,
  el: Element,
  postLink: string
): Promise<string | null> {
  // 1️⃣ Wix gallery image (best)
  const wixImage =
    $(el)
      .closest(".gallery-item-common-info-outer")
      .find('img[data-hook="gallery-item-image-img"]')
      .attr("src");

  if (wixImage) return wixImage;

  // 2️⃣ Fallback to post page
  return await extractImageFallback(postLink);
}

/* =======================
   Main Scraper
======================= */

export async function scrapeRupeetingBlog(
  props: ScrapeRupeetingProps
): Promise<ScrapedPost[]> {
  const BASE_URL = props.BaseUrl.replace(/\/$/, "");
  const results: ScrapedPost[] = [];

    console.log(`Scraping: ${BASE_URL}`);

    const { data } = await axios.get(BASE_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      validateStatus: status => status < 500,
    });

    const $ = cheerio.load(data);
    const items = $('[data-hook="post-list-item"]').toArray();

    for (const el of items) {
      const titleEl = $(el).find("h2.bD0vt9").first();
      const linkEl = titleEl.closest("a");

      const title = titleEl.text().trim();
      const href = linkEl.attr("href");

      if (!title || !href) continue;

      const link = href.startsWith("http") ? href : BASE_URL + href;

      const published = $(el)
        .find('span[data-hook="time-ago"]')
        .text()
        .trim();

      const author = $(el)
        .find('span[data-hook="user-name"]')
        .text()
        .trim();

      const excerpt = $(el)
        .find('[data-hook="post-description"]')
        .text()
        .trim();

      const image = await resolveImage($, el, link);

      results.push({
        title,
        link,
        published,
        author: author || "",
        image,
      });
    }

  return results;
}
