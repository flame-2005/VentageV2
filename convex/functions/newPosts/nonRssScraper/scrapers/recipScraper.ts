"use node"

import axios from "axios";
import * as cheerio from "cheerio";
import { extractAuthorSmart } from "../images/extractAuthorSmart";

/* =======================
   Types
======================= */

export interface ScrapedPost {
  title: string;
  link: string;
  published: string;
  author: string;
  excerpt: string;
  image: string | null;
}

type ScrapeFinologyProps = {
  BaseUrl: string;
};

/* =======================
   Utilities
======================= */

function cleanText(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

/* =======================
   Image Fallback
======================= */

async function extractImageFallback(url: string): Promise<string | null> {
  console.log("[image] fallback fetch:", url);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const img =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $("article img").first().attr("src") ||
      $("img").first().attr("src") ||
      null;

    console.log("[image] resolved:", img);
    return img;
  } catch (err) {
    console.error("[image] fallback error", err);
    return null;
  }
}

async function resolveImage(
  postLink: string,
  baseUrl: string
): Promise<string | null> {
  const img = await extractImageFallback(postLink);

  if (!img) return null;

  // 👇 SIMPLE FIX
  if (img.startsWith("/")) {
    return baseUrl + img;
  }

  return img;
}

/* =======================
   Main Scraper
======================= */

function getBaseUrl(url: string): string {
  const match = url.match(/^(https?:\/\/[^\/]+)/i);
  return match ? match[1] : "";
}

export async function scrapeFinologyPremiumResearch(
  props: ScrapeFinologyProps
): Promise<ScrapedPost[]> {
  const BASE_URL = getBaseUrl(props.BaseUrl);
  const START_URL = `${props.BaseUrl}`;

  console.log("[start] fetching:", START_URL);

  const results: ScrapedPost[] = [];

  const { data } = await axios.get(START_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  console.log("[page] fetched, length:", data.length);

  const $ = cheerio.load(data);

 const cards = $("a.col-25").toArray();
console.log("[cards] found:", cards.length);

for (const el of cards) {
  const title = cleanText($(el).find("h3").first().text());
  if (!title) continue;

  const published = cleanText(
    $(el).find("span.text-black-50").first().text()
  );

  const href = $(el).attr("href");
  if (!href) continue;

  const link = href.startsWith("http")
    ? href
    : BASE_URL + href;

  console.log("[card] link:", link);

  const excerpt = "";

  const image = await resolveImage(link, BASE_URL);
  const author = (await extractAuthorSmart({ link })) || "";

  results.push({
    title,
    link,
    published,
    author,
    excerpt,
    image,
  });


  console.log({
     title,
    link,
    published,
    author,
    excerpt,
    image,
  })
}


  console.log("\n[result] total exported:", results.length);
  return results;
}
