"use node"

import Parser from "rss-parser";
import { IncomingPost as BlogPost, RSSItem } from "../../../../constant/posts";
import { extractAuthor, extractDate, extractImage } from "../../../../helper/post";

const parser = new Parser();

export async function getPostsFromRSS(feedUrl: string): Promise<BlogPost[]> {
  try {
    const feed = await parser.parseURL(feedUrl);

    return feed.items.map((item: RSSItem) => ({
      title: item.title ?? "",
      link: item.link ?? "",
      published: extractDate(item),
      author: extractAuthor(item)!,
      image: extractImage(item)!,
      source: "others",
    }));
  } catch {
    return [];
  }
}

