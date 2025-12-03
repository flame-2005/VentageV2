// convex/processPosts.ts

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";
import { matchCompaniesWithMasterList, parseMultiMatch } from "../../helper/blogs";
import { Agent1Response, Agent2Response, CompanyDetail, IncomingPost } from "../../constant/posts";

type EnrichedPost = {
  title: string;
  link: string;
  pubDate: string;
  createdAt: number;
  author?: string;
  image?: string;
  source: string;

  summary?: string;
  classification?: string;
  category?: string;
  tags?: string[];

  companyDetails?: CompanyDetail[];
  companyName?: string;
  bseCode?: string;
  nseCode?: string;
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const processAndSavePosts = action({
  args: {
    posts: v.array(
      v.object({
        title: v.string(),
        link: v.string(),
        published: v.string(),
        author: v.optional(v.string()),
        image: v.optional(v.string()),
        content: v.string(),
        source: v.string(),
      })
    ),
  },

  handler: async (
    ctx,
    { posts }
  ): Promise<{
    totalProcessed: number;
    batches: number;
  }> => {
    console.log(`🔄 Processing ${posts.length} posts...`);

    const masterCompanyList = await ctx.runQuery(
      api.functions.masterCompanyList.getAllCompanies,
      {}
    );

    const enrichedPosts: EnrichedPost[] = [];

    for (const post of posts as IncomingPost[]) {
      console.log("📌 Processing:", post.title);

      const blogContent = post.content;

      // ---------------- AGENT 1 ----------------
      const agent1 = await ctx.runAction(
        api.functions.processBlogs.agents.classifierAgent.runAgent1,
        { blogText: blogContent }
      );

      const agent1Typed = agent1 as Agent1Response;

      // ---------------- AGENT 2 ----------------
      const agent2 = await ctx.runAction(
        api.functions.processBlogs.agents.companyAgent.runAgent2,
        { agent1Companies: agent1Typed.company }
      );

      const agent2Typed = agent2 as Agent2Response;

      // ---------------- MASTER MATCHING ----------------
      const joined =
        agent2Typed.public.length > 0
          ? agent2Typed.public.join(", ")
          : agent2Typed.private.join(", ");

      const matched = matchCompaniesWithMasterList(joined, masterCompanyList);

      const companyDetails = parseMultiMatch(matched);

      // ---------------- BUILD ENRICHED POST ----------------
      const enriched: EnrichedPost = {
        title: post.title,
        link: post.link,
        pubDate: new Date(post.published).toISOString(),
        createdAt: Date.now(),

        author: post.author,
        image: post.image,
        source: post.source,

        summary: agent1Typed.summary,
        classification: agent1Typed.classification,
        category: agent1Typed.classification,
        tags: agent1Typed.tags.length > 0 ? agent1Typed.tags : undefined,

        companyDetails: companyDetails.length > 0 ? companyDetails : undefined,
      };

      if (companyDetails.length > 0) {
        enriched.companyName = companyDetails
          .map((c) => c.company_name)
          .join(", ");

        if (companyDetails.length === 1) {
          enriched.bseCode = companyDetails[0].bse_code;
          enriched.nseCode = companyDetails[0].nse_code;
        }
      }

      enrichedPosts.push(enriched);
    }

    // ---------------- SAVE IN BATCHES ----------------
    const chunks = chunkArray<EnrichedPost>(enrichedPosts, 100);

    for (let i = 0; i < chunks.length; i++) {
      console.log(`📤 Saving batch ${i + 1}/${chunks.length}`);
      await ctx.runMutation(api.functions.substackBlogs.addBulkPost, {
        posts: chunks[i],
      });
    }

    return {
      totalProcessed: enrichedPosts.length,
      batches: chunks.length,
    };
  },
});
