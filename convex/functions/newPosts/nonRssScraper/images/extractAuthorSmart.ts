"use node"

import * as cheerio from "cheerio";
import { cleanAuthor, extractAuthorFromHTML } from "../utils/posts";

export interface AuthorItem {
  author?: string;
  creator?: string;
  ["dc:creator"]?: string;
  ["author:name"]?: string;
  ["byline"]?: string;
  link?: string;
  content?: string;
  summary?: string;
}

export async function extractAuthorSmart(
  item: AuthorItem
): Promise<string | null> {
  // -------------------------
  // 1️⃣ RSS / structured fields
  // -------------------------
  const candidates = [
    item.author,
    item.creator,
    item["dc:creator"],
    item["author:name"],
    item["byline"],
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      return cleanAuthor(c);
    }
  }

  // -------------------------
  // 2️⃣ HTML in RSS content
  // -------------------------
  if (item.content) {
    const a = extractAuthorFromHTML(item.content);
    if (a) return a;
  }

  if (item.summary) {
    const a = extractAuthorFromHTML(item.summary);
    if (a) return a;
  }

  // -------------------------
  // 3️⃣ Fetch article page
  // -------------------------
  if (!item.link) return null;

  try {
    const res = await fetch(item.link, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    // Meta tags
    const metaAuthor =
      $('meta[name="author"]').attr("content") ||
      $('meta[property="article:author"]').attr("content");

    if (metaAuthor) return cleanAuthor(metaAuthor);

    // Common visible patterns
    const selectors = [
      ".author",
      ".post-author",
      ".entry-author",
      ".blog-author",
      ".byline a",
      ".byline",
      "[rel='author']",
      "[itemprop='author']",
      "[itemprop='name']",
      ".post-meta-author",
      ".blog-item-author",
    ];

    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text) return cleanAuthor(text);
    }
  } catch {
    // silent fail
  }

  return null;
}
