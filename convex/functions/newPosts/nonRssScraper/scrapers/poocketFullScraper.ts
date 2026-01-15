"use node"

import axios from "axios";
import * as cheerio from "cheerio";
import { extractAuthorSmart } from "../images/extractAuthorSmart";
import { normalizeUrl } from "../../../../helper/blogs";

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

type ScrapePocketfulProps = {
  BaseUrl: string;
};

/* =======================
   Utilities
======================= */

function cleanText(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

/* =======================
   Pocketful Post Extractors
======================= */

function extractPocketfulAuthor($: cheerio.CheerioAPI): string | null {
  const el = $("div")
    .filter((_, node) =>
      $(node).clone().children().remove().end().text().trim() === "Written by :"
    )
    .first();

  if (!el.length) return null;

  const author = el.find("span").first().text().trim();
  return author || null;
}


function extractPocketfulPublished($: cheerio.CheerioAPI): string | null {
  const el = $("div")
    .filter((_, node) =>
      $(node).clone().children().remove().end().text().trim() === "Published on :"
    )
    .first();

  if (!el.length) return null;

  const published = el.find("span").first().text().trim();
  return published || null;
}


/* =======================
   Post Page Fetch
======================= */

export async function fetchPocketfulPostMeta(
  url: string
): Promise<{ author: string; published: string }> {
  console.log("\n[post] fetching:", url);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    console.log("[post] status:", res.status);

    const html = await res.text();
    const $ = cheerio.load(html);

    const pageAuthor = extractPocketfulAuthor($);
    const pagePublished = extractPocketfulPublished($);

    console.log("[post] extracted author:", pageAuthor);
    console.log("[post] extracted published:", pagePublished);

    let author = pageAuthor || "";
    const published = pagePublished || "";

    if (!author) {
      console.log("[post] author not found, using fallback");
      author = (await extractAuthorSmart({ link: url })) || "";
    }

    if (!published) {
      console.log("[post] published not found");
    }

    return { author, published };
  } catch (err) {
    console.error("[post] fetch error:", err);
    return { author: "", published: "" };
  }
}

/* =======================
   Main Scraper
======================= */

export async function scrapePocketfulCaseStudy(
  props: ScrapePocketfulProps
): Promise<ScrapedPost[]> {

  // ✅ Always normalize to site origin
  const BASE_URL = normalizeUrl(props.BaseUrl);

  // ✅ Correct category URL (DO NOT normalize this)
  const START_URL = `${BASE_URL}/blog/category/case-study/`;

  console.log("[start] fetching category:", START_URL);

  const results: ScrapedPost[] = [];

  const { data } = await axios.get(START_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  console.log("[page] category html length:", data.length);

  const $ = cheerio.load(data);

  // ✅ Correct selector for Pocketful cards
  const cards = $("figure.hiddenScrollAnimation").toArray();
  console.log("[cards] found:", cards.length);

  let index = 0;

  for (const el of cards) {
    index++;
    console.log(`\n[card ${index}] processing`);

    const title = cleanText(
      $(el).find("figcaption a").first().text()
    );

    if (!title) {
      console.warn("[card] SKIP — no title");
      continue;
    }

    console.log("[card] title:", title);

    const href = $(el).find("a").first().attr("href");
    if (!href) {
      console.warn("[card] SKIP — no link");
      continue;
    }

    const link = href.startsWith("http")
      ? href
      : BASE_URL + href;

    console.log("[card] link:", link);

    const imgSrc = $(el).find("img").first().attr("src") || null;

    const image =
      imgSrc && imgSrc.startsWith("/")
        ? BASE_URL + imgSrc
        : imgSrc;

    console.log("[card] image:", image);

    const { author, published } =
      await fetchPocketfulPostMeta(link);

    results.push({
      title,
      link,
      published,
      author,
      excerpt: "",
      image,
    });

    console.log("[card] ✅ pushed");
  }

  console.log("\n[result] total exported:", results.length);
  return results;
}
