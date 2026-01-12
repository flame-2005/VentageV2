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
  authorsFollowing: string[];
  blogWebsitesFollowing: string[];
}

export const ALLOWED_EMAILS = [
  "alamshadab9876543210@gmail.com",
  "pkeday@gmail.com",
];
