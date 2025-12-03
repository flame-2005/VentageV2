import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Fetch latest blog feeds",
  { hours: 24 },  
  api.functions.newPosts.checkNewPosts.fetchAllBlogsAction
);

export default crons;
