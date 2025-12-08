"use node"

import Parser from "rss-parser";
import { IncomingPost as BlogPost } from "../../../../constant/posts";

const parser = new Parser();

export async function getPostsFromRSS(feedUrl: string): Promise<BlogPost[]> {
  try {
    const feed = await parser.parseURL(feedUrl);

    return feed.items.map((item) => ({
      title: item.title ?? "",
      link: item.link ?? "",
      published: item.isoDate ?? item.pubDate ?? "",
      author: item.creator ?? item.author,
      image:
        item.enclosure?.url ??
        (item["media:content"]?.url as string | undefined),
      source:'others'
    }));
  } catch (err) {
    return [];
  }
}
