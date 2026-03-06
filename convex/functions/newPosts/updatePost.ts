"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import { CompanyDetail } from "../../constant/posts";
import { Id } from "../../_generated/dataModel";
import { fetchArticleContent } from "../../helper/blogs";
import { calculateIsValidAnalysis } from "../../helper/post";
import { extractCompanies } from "../processBlogs/newTaggingAlgo/Agents/extractCompanies";
import { resolveWithFilter } from "../processBlogs/newTaggingAlgo/Agents/VectorDBMatcher";
import { Company, validateCompanies } from "../processBlogs/newTaggingAlgo/Agents/varifyCompanies";

type CandidatePost = {
  _id: Id<"posts">;
  title: string;
  link: string;
  author?: string;
  classification?: string;
  companyDetails?: CompanyDetail[];
};

export const recheckLastMonthPosts = action({
  args: {
    limit: v.optional(v.number()),
    parallelBatchSize: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 200, parallelBatchSize = 5 }) => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const cutoffIso = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

    const candidates = (await ctx.runQuery(
      api.functions.newPosts.updatePostDb.getLastMonthRecheckCandidates,
      { cutoffIso, limit },
    )) as CandidatePost[];

    if (candidates.length === 0) {
      return {
        success: true,
        scanned: 0,
        updated: 0,
        nowValid: 0,
        stillInvalid: 0,
        failed: 0,
      };
    }

    let updated = 0;
    let nowValid = 0;
    let stillInvalid = 0;
    let failed = 0;

    for (let i = 0; i < candidates.length; i += parallelBatchSize) {
      const batch = candidates.slice(i, i + parallelBatchSize);

      await Promise.all(
        batch.map(async (post) => {
          try {
            const classification = post.classification;
            if (!classification) {
              failed++;
              return;
            }

            const blogContent = await fetchArticleContent(post.link);
            if (!blogContent) {
              failed++;
              return;
            }

            const extracted = await extractCompanies(classification, blogContent);
            const extractedNames = extracted.map((c) => c.company.toUpperCase());

            const resolved = await resolveWithFilter(extractedNames);

            const matchedCompanies: Company[] = resolved
              .filter(
                (res) =>
                  (res.status === "found" || res.status === "ambiguous") &&
                  (res.nseCode || res.bseCode),
              )
              .map((res) => ({
                name: res.matchedName ?? res.inputName,
                extractedName: res.inputName,
                nse: res.nseCode,
                bse: res.bseCode,
                marketCap: res.marketCap ?? 0,
              }));

            const validated = await validateCompanies({
              blogContent,
              companies: matchedCompanies,
            });

            const validatedCompanies = validated.validatedCompanies.filter(
              (result) => result.isMatch,
            );

            const companyDetails: CompanyDetail[] = validatedCompanies.map(
              (result) => ({
                company_name: result.company.name,
                bse_code: result.company.bse,
                nse_code: result.company.nse,
                market_cap: result.company.marketCap,
              }),
            );

            const isValidAnalysis = calculateIsValidAnalysis({
              companyDetails,
              classification,
              author: post.author,
            });

            await ctx.runMutation(
              internal.functions.newPosts.updatePostDb.patchRecheckedPost,
              {
                postId: post._id,
                companyDetails: companyDetails.length > 0 ? companyDetails : undefined,
                companyName:
                  companyDetails.length > 0
                    ? companyDetails.map((c) => c.company_name).join(", ")
                    : undefined,
                bseCode:
                  companyDetails.length === 1 ? companyDetails[0].bse_code : undefined,
                nseCode:
                  companyDetails.length === 1 ? companyDetails[0].nse_code : undefined,
                isValidAnalysis,
              },
            );

            updated++;
            if (isValidAnalysis) nowValid++;
            else stillInvalid++;
          } catch (error) {
            console.error("Failed to recheck post:", post._id, error);
            failed++;
          }
        }),
      );
    }

    return {
      success: true,
      scanned: candidates.length,
      updated,
      nowValid,
      stillInvalid,
      failed,
    };
  },
});
