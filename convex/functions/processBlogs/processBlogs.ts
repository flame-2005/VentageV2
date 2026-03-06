"use node";

// convex/processPosts.ts

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { fetchArticleContent } from "../../helper/blogs";
import { CompanyDetail } from "../../constant/posts";
import { Id } from "../../_generated/dataModel";
import {
  calculateIsValidAnalysis,
  convertRssDateToIso,
  getValidImageUrl,
} from "../../helper/post";
import { classifyBlog } from "./newTaggingAlgo/Agents/ClassificationAgent";
import { extractCompanies } from "./newTaggingAlgo/Agents/extractCompanies";
import { resolveWithFilter } from "./newTaggingAlgo/Agents/VectorDBMatcher";
import {
  Company,
  validateCompanies,
} from "./newTaggingAlgo/Agents/varifyCompanies";
import { summarizeBlog } from "./newTaggingAlgo/Agents/summarizeAgent";

type EnrichedPost = {
  blogId?: Id<"blogs">;
  title: string;
  link: string;
  pubDate: string;
  createdAt: number;
  author?: string;
  image?: string | undefined;
  imageUrl?: string | undefined;
  source: string;

  summary?: string;
  classification?: string;
  category?: string;
  tags?: string[];
  isValidAnalysis?: boolean;

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
        image: v.optional(v.union(v.string(), v.null())),
        source: v.string(),
      }),
    ),
  },

  handler: async (
    ctx,
    { posts },
  ): Promise<{
    totalProcessed: number;
    batches: number;
  }> => {
    console.log(`🔄 Processing ${posts.length} posts...`);

    const blogs = await ctx.runQuery(
      api.functions.substackBlogs.getAllBlogs,
      {},
    );
    const blogMap = new Map(blogs.map((b) => [b._id, b]));

    // Process posts in parallel batches of 10
    const PARALLEL_BATCH_SIZE = 10;
    const enrichedPosts: EnrichedPost[] = [];

    for (let i = 0; i < posts.length; i += PARALLEL_BATCH_SIZE) {
      const batch = posts.slice(i, i + PARALLEL_BATCH_SIZE);
      console.log(
        `🔄 Processing batch ${Math.floor(i / PARALLEL_BATCH_SIZE) + 1}/${Math.ceil(posts.length / PARALLEL_BATCH_SIZE)}`,
      );

      const batchResults = await Promise.all(
        batch.map(async (post) => {
          try {
            console.log("📌 Processing:", post.title);

            // Fetch blog content
            const blogContent = await fetchArticleContent(post.link);
            if (!blogContent) {
              console.warn("⚠️ No content for:", post.title);
              return null;
            }

            // Agent 1: Classify blog
            console.log("  → Agent 1: Classifying blog...");
            const agent1Response = await classifyBlog(blogContent);

            // Agent 2: Extract companies
            console.log("  → Agent 2: Extracting companies...");
            const agent2Response = await extractCompanies(
              agent1Response.classification,
              blogContent,
            );

            const companies = agent2Response.map((res) =>
              res.company.toUpperCase(),
            );

            // Agent 3: Resolve company names with vector DB
            console.log("  → Agent 3: Resolving company names...");
            const agent3Response = await resolveWithFilter(companies);

            // Filter to only include companies with status 'found' or 'ambiguous'
            const matchedCompanies: Company[] = agent3Response
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
                marketCap: res.marketCap!,
              }));

            // Agent 4: Validate companies against blog content
            console.log("  → Agent 4: Validating companies...");
            const agent4Response = await validateCompanies({
              blogContent: blogContent,
              companies: matchedCompanies,
            });

            // Agent 5: Summarize blog
            console.log("  → Agent 5: Summarizing blog...");
            const agent5Response = await summarizeBlog(blogContent);

            // Extract only validated companies that matched (isMatch: true)
            const validatedCompanies = agent4Response.validatedCompanies.filter(
              (result) => result.isMatch,
            );

            // Convert validated companies to CompanyDetail format
            const companyDetails: CompanyDetail[] = validatedCompanies.map(
              (result) => ({
                company_name: result.company.name,
                bse_code: result.company.bse,
                nse_code: result.company.nse,
                market_cap: result.company.marketCap,
              }),
            );

            const enriched: EnrichedPost = {
              blogId: post.blogId,
              title: post.title,
              link: post.link,
              pubDate: convertRssDateToIso(post.published),
              createdAt: Date.now(),
              author: post.author,
              image: post.image ? getValidImageUrl(post.image) : undefined,
              imageUrl: blogMap.get(post.blogId!)?.imageUrl ?? undefined,
              source: post.source,
              summary: agent5Response.summary,
              isValidAnalysis: calculateIsValidAnalysis({
                companyDetails,
                classification: agent1Response.classification,
                author: post.author,
              }),
              classification: agent1Response.classification,
              category: agent1Response.classification,
              tags:
                agent5Response.tags?.length > 0
                  ? agent5Response.tags
                  : undefined,
              companyDetails:
                companyDetails.length > 0 ? companyDetails : undefined,
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

            const companyCount = validatedCompanies.length;
            console.log(
              `  ✓ Complete: ${companyCount} validated companies found`,
            );

            return enriched;
          } catch (error) {
            console.error("❌ Error processing post:", post.title, error);
            return null;
          }
        }),
      );

      enrichedPosts.push(
        ...batchResults.filter((p): p is EnrichedPost => p !== null),
      );
    }

    // Save in batches
    const chunks = chunkArray<EnrichedPost>(enrichedPosts, 100);
    for (let i = 0; i < chunks.length; i++) {
      console.log(`📤 Saving batch ${i + 1}/${chunks.length}`);
      const insertedPosts = await ctx.runMutation(
        api.functions.substackBlogs.addBulkPost,
        {
          posts: chunks[i],
        },
      );

      // 🔥 Fetch full inserted posts from DB
      const fullPosts = await Promise.all(
        insertedPosts.map((p) =>
          ctx.runQuery(api.functions.substackBlogs.getPost, {
            id: p.postId,
          }),
        ),
      );

      // 🔥 Filter only valid ones
      const validPosts = fullPosts.filter(
        (post): post is NonNullable<typeof post> =>
          post !== null && post?.isValidAnalysis === true,
      );
      // 🔥 Convert to validItems format
      if (validPosts.length > 0) {
        const validItemsPayload = validPosts.map((post) => ({
          sourceType: "post" as const,
          itemId: post._id,
          sourceId: post.blogId ?? undefined,
          title: post.title,
          link: post.link,
          authorName: post.author ?? "Unknown",
          pubDate: post.pubDate,
          createdAt: post.createdAt,
          summary: post.summary ?? "",
          imageUrl: post.imageUrl ?? post.image,
          thumbnail: post.image ?? undefined,
          duration: undefined,
          companyName: post.companyName ?? "",
          bseCode: post.bseCode,
          nseCode: post.nseCode,
          companyDetails: post.companyDetails ?? [],
          classification: post.classification ?? "",
          tags: post.tags ?? [],
          source: post.source!,
        }));

        // 🔥 Bulk insert into validItems (max 100 safe)
        if (validItemsPayload.length > 0) {
          await ctx.runMutation(api.functions.validItems.bulkInsertValidItems, {
            items: validItemsPayload,
          });
        }
      }
      for (const p of insertedPosts) {
        await ctx.scheduler.runAfter(
          0,
          internal.functions.tracking.notification.notifyOnPostCreated,
          {
            postId: p.postId,
            companyIds: p.companyNames,
            authorId: p.author,
          },
        );
      }
    }

    return {
      totalProcessed: enrichedPosts.length,
      batches: chunks.length,
    };
  },
});
