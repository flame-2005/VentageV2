import { action, query } from "../_generated/server";
import Papa from "papaparse";
import { hasCompanyData } from "./blogs";
import { api } from "../_generated/api";


// 2️⃣ Generate CSV for both
export const exportCsv = action({
  handler: async (ctx) => {
    // MUST pass an empty args object {}
    const { matched, notMatched } = await ctx.runQuery(
      api.functions.substackBlogs.splitPosts,
      {}
    );

    const matchedCsv = Papa.unparse(matched);
    const notMatchedCsv = Papa.unparse(notMatched);

    // storeBlob returns a BlobId, not URL
    const matchedBlobId = await ctx.storage.store(
      new Blob([matchedCsv], { type: "text/csv" })
    );

    const notMatchedBlobId = await ctx.storage.store(
      new Blob([notMatchedCsv], { type: "text/csv" })
    );

    return {
      matchedCsvUrl: await ctx.storage.getUrl(matchedBlobId),
      notMatchedCsvUrl: await ctx.storage.getUrl(notMatchedBlobId),
    };
  },
});
