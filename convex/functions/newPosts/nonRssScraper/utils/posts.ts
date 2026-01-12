"use node"

import * as cheerio from "cheerio";


export function cleanAuthor(input: string): string {
  return input
    .replace(/^by\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}


export function extractAuthorFromHTML(html: string): string | null {
  const $ = cheerio.load(html);

  const text = $(
    ".author, .byline, [rel='author'], [itemprop='author']"
  )
    .first()
    .text()
    .trim();

  return text ? cleanAuthor(text) : null;
}


