import { Id } from "../_generated/dataModel";

export type CompanyDetail = {
  company_name: string;
  bse_code?: string;
  nse_code?: string;
  market_cap?: number;
};

export type Agent1Response = {
  classification: string;
  company: string[];
  sector: string;
  tags: string[];
  category: string;
  summary: string;
};

export type Agent2Response = {
  public: string[];
  private: string[];
};

export type IncomingPost = {
  title: string;
  link: string;
  published: string;
  author?: string;
  image?: string | null;
  source: string;
  blogId?: Id<"blogs">;
};

export enum ValidClassification {
  CompanyAnalysis = "Company_analysis",
  MultipleCompanyAnalysis = "Multiple_company_analysis",
  SectorAnalysis = "Sector_analysis",
}

export interface RSSItem {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  published?: string;

  // Author variations
  "dc:creator"?: string;
  creator?: string;
  author?: string;
  "itunes:author"?: string;
  "meta:author"?: string;
  "article:author"?: string;
  "atom:author"?: string;

  // Images
  enclosure?: { url?: string };
  "media:content"?: { url?: string };
  "media:thumbnail"?: { url?: string };
  "media:group"?: {
    "media:content"?: { url?: string };
  };

  logo?: string;
  icon?: string;
  image?: string;
  featuredImage?: string;
  coverImage?: string;
  avatar?: string;
  ogImage?: string;
  thumbnail?: string;
  "post-thumbnail"?: string;

  // Dates
  "dc:date"?: string;
  updated?: string;
  lastBuildDate?: string;

  // Allow unknown fields safely without any
  [key: string]: unknown;
}


export type calculateIsValidAnalysisParams = {
  nseCode?: string;
  bseCode?: string;
  companyDetails?: CompanyDetail[];
  classification?: string;
  author?: string;
};