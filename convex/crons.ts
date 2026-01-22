import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Fetch latest blog feeds",
  { hours: 24 },  
  api.functions.newPosts.checkNewPosts.fetchAllBlogsAction
);

crons.weekly(
  "refresh-master-company-details-weekly",
  {
    // Sunday at 03:00 UTC (adjust if needed)
    dayOfWeek:"sunday",
    hourUTC: 3,
    minuteUTC: 0,
  },
  api.functions.masterCompanies.refreshMasterCompanyDetails
);


export default crons;
