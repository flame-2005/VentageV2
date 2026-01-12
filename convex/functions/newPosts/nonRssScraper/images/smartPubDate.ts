"use node"

import * as cheerio from "cheerio";

export interface PublishDateItem {
  pubDate?: string;
  published?: string;
  updated?: string;
  ["dc:date"]?: string;
  ["date"]?: string;
  content?: string;
  summary?: string;
  link?: string;
}

/**
 * Normalize date safely
 */
function normalizeDate(dateStr: string): string | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Extract date from raw HTML text
 */
function extractDateFromHTML(html: string): string | null {
  // Common date patterns
  const patterns = [
    /\b\d{4}-\d{2}-\d{2}\b/,                // 2024-01-31
    /\b\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{4}\b/i,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{1,2},\s\d{4}\b/i,
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m) return normalizeDate(m[0]);
  }

  return null;
}

export async function smartPublishDate(
  item: PublishDateItem
): Promise<string | null> {
  // -------------------------
  // 1️⃣ RSS / structured fields
  // -------------------------
  const candidates = [
    item.pubDate,
    item.published,
    item.updated,
    item["dc:date"],
    item["date"],
  ];

  for (const c of candidates) {
    if (typeof c === "string") {
      const d = normalizeDate(c);
      if (d) return d;
    }
  }

  // -------------------------
  // 2️⃣ Date inside RSS HTML
  // -------------------------
  if (item.content) {
    const d = extractDateFromHTML(item.content);
    if (d) return d;
  }

  if (item.summary) {
    const d = extractDateFromHTML(item.summary);
    if (d) return d;
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

    // -------------------------
    // 3a️⃣ Meta tags (PLIndia works here)
    // -------------------------
    const metaDate =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="publish-date"]').attr("content") ||
      $('meta[name="date"]').attr("content") ||
      $('meta[itemprop="datePublished"]').attr("content");

    if (metaDate) {
      const d = normalizeDate(metaDate);
      if (d) return d;
    }

    // -------------------------
    // 3b️⃣ Time / date elements
    // -------------------------
    const timeDate =
      $("time[datetime]").attr("datetime") ||
      $("time").first().text();

    if (timeDate) {
      const d = normalizeDate(timeDate);
      if (d) return d;
    }

    // -------------------------
    // 3c️⃣ Common visible selectors
    // -------------------------
    const selectors = [
      ".post-date",
      ".entry-date",
      ".published",
      ".blog-date",
      ".article-date",
      ".post-meta-date",
      "[itemprop='datePublished']",
    ];

    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text) {
        const d = normalizeDate(text);
        if (d) return d;
      }
    }

    // -------------------------
    // 3d️⃣ JSON-LD (very reliable)
    // -------------------------
    const jsonLd = $('script[type="application/ld+json"]')
      .map((_, el) => $(el).html())
      .get();

    for (const block of jsonLd) {
      try {
        const data = JSON.parse(block || "");
        const obj = Array.isArray(data) ? data[0] : data;

        const d =
          obj?.datePublished ||
          obj?.dateCreated ||
          obj?.dateModified;

        if (typeof d === "string") {
          const nd = normalizeDate(d);
          if (nd) return nd;
        }
      } catch {
        // ignore broken JSON
      }
    }
  } catch {
    // silent fail
  }

  return null;
}
