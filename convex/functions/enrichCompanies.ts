"use node";

// convex/actions/enrichCompanies.ts
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { fetchMarketCap } from "../helper/enrichMasterCompanies";
import { v } from "convex/values";

const BATCH_SIZE = 10;

export const enrichCompaniesChunk = action({
  args: {
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, { cursor }) => {
    const companies = await ctx.runQuery(
      api.functions.masterCompany.getCompaniesNeedingMarketCap,
      { cursor, limit: BATCH_SIZE },
    );

    if (companies.length === 0) {
      console.log("✅ Enrichment complete");
      return;
    }

    const updates = [];

    for (const company of companies) {
      let result = await fetchMarketCap(
        company.nse_code,
        company.exchange === "BSE" ? "BSE" : "NSE",
      );

      if (!result && company.exchange === "BSE" && company.bse_code) {
        result = await fetchMarketCap(company.bse_code, "BSE");
      }

      updates.push({
        id: company._id,
        market_cap: result.marketCap,
        checked_market_cap: true,
      });
    }

    if (updates.length > 0) {
      await ctx.runMutation(
        api.functions.masterCompany.bulkUpdateCompanyEnrichment,
        { updates },
      );
    }

    // ✅ Cursor must match order field (_creationTime)
    const lastCursor = companies[companies.length - 1]._creationTime;

    // ✅ Schedule next chunk safely
    await ctx.scheduler.runAfter(
      0,
      api.functions.enrichCompanies.enrichCompaniesChunk,
      { cursor: lastCursor },
    );
  },
});
