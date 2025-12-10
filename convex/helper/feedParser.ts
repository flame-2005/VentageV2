"use node";

import Parser, { Output } from "rss-parser";
import { RSSFeed } from "../constant/fetcher";
import { normalizeUrl } from "./blogs";

export async function tryParseFeed(
  parser: Parser<RSSFeed>,
  baseUrl: string
): Promise<Output<RSSFeed> | null> {
  const root = normalizeUrl(baseUrl);
  const candidates: string[] = [
    `${root}/feed`,
    `${root}/feed/`,
    `${root}/rss`,
    `${root}/rss.xml`,
    `${root}/index.xml`,
    `${root}/atom.xml`,
  ];

  for (const url of candidates) {
    try {
      const feed = await parser.parseURL(url);
      return feed;
    } catch {
      continue;
    }
  }

  return null;
}
