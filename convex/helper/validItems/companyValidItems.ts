import { paginationOptsValidator } from "convex/server";
import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const migrateCompanyValidPosts = mutation({
  args: {
    batchSize: v.optional(v.number()),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {

    const pages = await ctx.db.query("validItems").collect();

    let totalCreated = 0;
    const errors: Array<{ itemsId: string; error: string }> = [];

    for (const post of pages) {
      try {
        // Case 1: companyDetails array
        if (post.companyDetails?.length) {
          for (const company of post.companyDetails) {
            await ctx.db.insert("companyValidItems", {
              itemsId: post._id,
              sourceType: post.sourceType,
              companyName: company.company_name,
              bseCode: company.bse_code,
              nseCode: company.nse_code,
              pubDate: post.pubDate,
              marketCap: company.market_cap,
            });
            totalCreated++;
          }
        }
        // Case 2: fallback single company
        else if (post.companyName) {
          await ctx.db.insert("companyValidItems", {
            itemsId: post._id,
            sourceType: post.sourceType,
            companyName: post.companyName,
            bseCode: post.bseCode,
            nseCode: post.nseCode,
            pubDate: post.pubDate,
            marketCap: undefined,
          });
          totalCreated++;
        }
      } catch (error) {
        errors.push({
          itemsId: post._id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: true,
      postsProcessed: pages.length,
      companyPostsCreated: totalCreated,
      errors: errors.length ? errors : undefined,
    };
  },
});
