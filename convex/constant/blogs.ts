import { Id } from "../_generated/dataModel";

export interface Blog {
  _id: Id<"blogs">;
  _creationTime: number;

  name: string;
  domain: string;
  feedUrl: string;

  lastCheckedAt?: number;
  source?: string;
  imageUrl?: string;
  extractionMethod?: string;
}


export enum ExtractionMethod {
  Others = "Others",
  RSS = "RSS",
}