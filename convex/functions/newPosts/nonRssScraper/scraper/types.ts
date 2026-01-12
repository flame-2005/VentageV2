export interface ScrapedPost {
  title: string;
  link: string;
  published: string;
  author: string;
  image?: string | null;
}

export interface Scraper {
  name: string;
  canHandle?: (url: string) => boolean;
  scrape: (url: string) => Promise<Omit<ScrapedPost, "image">[]>;
}



export interface RSSItem {
  title?: string;
  link?: string;
  content?: string;
  pubDate?: string;
  enclosure?: {
    url?: string;
  };
}

export interface CompanyDirectoryItem {
  name: string;
  symbol: string;
  link: string;
  byline: string;
  themes: string[];
}
