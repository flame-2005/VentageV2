import { Id } from "@/convex/_generated/dataModel";

export type Blog = {
  _id: Id<"blogs">;
  name: string;
  domain: string;
  feedUrl: string;
  lastCheckedAt?: number;
  description?: string;
  image?: string;
  companyName?: string;
  extractionMethod?:string
  blogId?: Id<"blogs">;
};
