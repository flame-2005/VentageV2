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
  image?: string;
  source: string;
  blogId?: Id<"blogs">;
};