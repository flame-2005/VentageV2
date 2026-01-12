"use node"

import type { CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

/**
 * Build a stable CSS selector from a Cheerio element
 * Uses: tag + classes (no nth-child, no ids by default)
 */
export function buildSelector(
  $: CheerioAPI,
  el: Element | undefined
): string {
  const tagName = el?.tagName?.toLowerCase();
  if (!tagName) return "*";

  const classAttr = $(el).attr("class");
  if (!classAttr) return tagName;

  const classes = classAttr
    .split(" ")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  if (classes.length === 0) return tagName;

  return `${tagName}.${classes.join(".")}`;
}
