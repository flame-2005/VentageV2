export interface RSSFeed {
  title?: string;
  link?: string;
  description?: string;
  image?: {
    url?: string;
    link?: string;
    title?: string;
  };

  items?: unknown[];

  // allow XML extension fields like "media:thumbnail"
  [key: string]: unknown;
}

