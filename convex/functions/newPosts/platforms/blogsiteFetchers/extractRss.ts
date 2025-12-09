"use node";

export function extractRSSLinks(html: string, baseUrl: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const feeds: string[] = [];

  doc.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]').forEach((el) => {
    const href = el.getAttribute("href");
    if (href) feeds.push(href.startsWith("http") ? href : new URL(href, baseUrl).href);
  });

  // fallback guesses
  const guesses = ["feed", "rss", "atom"].map((p) => `${baseUrl}/${p}`);
  return [...feeds, ...guesses];
}
