// convex/processPosts.ts

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";
import { fetchArticleContent, matchCompaniesWithMasterList, parseMultiMatch } from "../../helper/blogs";
import { Agent1Response, Agent2Response, CompanyDetail, IncomingPost } from "../../constant/posts";
import { Id } from "../../_generated/dataModel";
import { convertRssDateToIso } from "../../helper/post";

type EnrichedPost = {
  blogId?: Id<"blogs">;
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
        blogId: v.optional(v.id("blogs")),
        title: v.string(),
        link: v.string(),
        published: v.string(),
        author: v.optional(v.string()),
        image: v.optional(v.string()),
        source: v.string(),
      })
    ),
  },

  handler: async (ctx, { posts }): Promise<{
    totalProcessed: number;
    batches: number;
  }> => {
    console.log(`🔄 Processing ${posts.length} posts...`);

    const masterCompanyList = await ctx.runQuery(
      api.functions.masterCompanyList.getAllCompanies,
      {}
    );

    // Process posts in parallel batches of 5
    const PARALLEL_BATCH_SIZE = 10;
    const enrichedPosts: EnrichedPost[] = [];

    for (let i = 0; i < posts.length; i += PARALLEL_BATCH_SIZE) {
      const batch = posts.slice(i, i + PARALLEL_BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i / PARALLEL_BATCH_SIZE) + 1}/${Math.ceil(posts.length / PARALLEL_BATCH_SIZE)}`);

      const batchResults = await Promise.all(
        batch.map(async (post) => {
          try {
            console.log("📌 Processing:", post.title);

            const blogContent = await fetchArticleContent(post.link);
            if (!blogContent) {
              console.warn("⚠️ No content for:", post.title);
              return null;
            }

            // Run both agents in parallel
            const [agent1, agent2Raw] = await Promise.all([
              ctx.runAction(
                api.functions.processBlogs.agents.classifierAgent.runAgent1,
                { blogText: blogContent }
              ),
              // Agent 2 needs agent 1 result, so we handle it after
              (async () => {
                const a1 = await ctx.runAction(
                  api.functions.processBlogs.agents.classifierAgent.runAgent1,
                  { blogText: blogContent }
                );
                return ctx.runAction(
                  api.functions.processBlogs.agents.companyAgent.runAgent2,
                  { agent1Companies: (a1 as Agent1Response).company }
                );
              })(),
            ]);

            const agent1Typed = agent1 as Agent1Response;
            const agent2Typed = agent2Raw as Agent2Response;

            const joined =
              agent2Typed.public.length > 0
                ? agent2Typed.public.join(", ")
                : agent2Typed.private.join(", ");

            const matched = matchCompaniesWithMasterList(joined, masterCompanyList);
            const companyDetails = parseMultiMatch(matched);

            const enriched: EnrichedPost = {
              blogId: post.blogId,
              title: post.title,
              link: post.link,
              pubDate: convertRssDateToIso(post.published),
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
              enriched.companyName = companyDetails.map((c) => c.company_name).join(", ");
              if (companyDetails.length === 1) {
                enriched.bseCode = companyDetails[0].bse_code;
                enriched.nseCode = companyDetails[0].nse_code;
              }
            }

            return enriched;
          } catch (error) {
            console.error("❌ Error processing post:", post.title, error);
            return null;
          }
        })
      );

      enrichedPosts.push(...batchResults.filter((p): p is EnrichedPost => p !== null));
    }

    // Save in batches
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
