"use node"

export async function fetchMediumPosts(profileUrl: string) {
  // Convert profile → RSS
  // medium.com/@user → https://medium.com/feed/@user
  const username = profileUrl.split("@")[1];
  const rssUrl = `https://medium.com/feed/@${username}`;

  const xml = await fetch(rssUrl).then((res) => res.text());

  // Extract all <item> blocks
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  return items.map((match) => parseMediumItem(match[1]));
}

function parseMediumItem(xml: string) {
  const get = (tag: string) => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
    const match = xml.match(regex);
    return match ? decodeHtml(match[1].trim()) : "";
  };

  const getCDATA = (tag: string) => {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`);
    const match = xml.match(regex);
    return match ? match[1].trim() : get(tag);
  };

  const title = getCDATA("title");
  const link = get("link");
  const published = get("pubDate");
  const author = getCDATA("dc:creator");

  // extract first <img> from <content:encoded>
  const content = getCDATA("content:encoded");
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
  const image = imgMatch ? imgMatch[1] : undefined;

  return { title, link, published, author, image,source:"medium" };
}

function decodeHtml(str: string) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}
