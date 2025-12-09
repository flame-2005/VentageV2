import { Id } from "@/convex/_generated/dataModel";

export interface user {
  _id: Id<"users">;
  userId: string;
  email: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: number;
  companiesFollowing: string[];
  blogWebsitesFollowing: string[];
}