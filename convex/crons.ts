import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Fetch latest blog feeds",
  { hours: 24 },  
  api.cronEntry.fetchFeed.fetchAndUpdateFeeds
);

export default crons;
