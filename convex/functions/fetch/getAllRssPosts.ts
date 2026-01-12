"use node"

import { runAgent1 } from "./agents/agent1";
import { runAgent2 } from "./agents/agent2";
import { fetchArticleContent } from "../../helper/blogs";
import { Id } from "../../_generated/dataModel";
import { matchCompaniesWithMasterList } from "../../helper/blogs";
import { fetchHistoricalFromRSS } from "./universalRssFetcher";
import { api } from "../../_generated/api";
import { action } from "../../_generated/server";
import { v } from "convex/values";

type CompanyDetail = {
  company_name: string;
  bse_code?: string;
  nse_code?: string;
  market_cap?: number;
};

// Updated to match Convex schema
type ConvexPost = {
  blogId?: Id<"blogs">;
  title: string;
  link: string;
  pubDate: string;
  author?: string;
  description?: string;
  content?: string;
  createdAt: number;
  summary?: string;
  classification?: string;
  category?: string;
  tags?: string[];
  companyDetails?: CompanyDetail[];
  companyName?: string;
  bseCode?: string;
  nseCode?: string;
  image?: string;
  imageUrl?: string;
  views?: string;
  likes?: string;
  source: string;
  lastCheckedAt?: number;
};

type Candidate = {
  original: string;
  normalized: string;
  expanded: string;
};

// Helper: Convert parsed multi-match CSV → structured array
type MultiMatchInput = {
  company_name: string | null;
  bse_code: string | null;
  nse_code: string | null;
  market_cap: string | null;
};

type MasterCompany = {
  _id: Id<"master_company_list">;
  _creationTime: number;
  company_name: string;
  bse_code: string | null;
  nse_code: string | null;
  market_cap: number | null;
  // Add any other fields from your master company list
};

export function parseMultiMatch(matched: MultiMatchInput): CompanyDetail[] {
  if (!matched.company_name) return [];

  const names = matched.company_name.split(",").map((s) => s.trim());

  const bse = matched.bse_code
    ? matched.bse_code.split(",").map((s) => s.trim())
    : [];

  const nse = matched.nse_code
    ? matched.nse_code.split(",").map((s) => s.trim())
    : [];

  const mcaps = matched.market_cap
    ? matched.market_cap.split(",").map((s) => {
        const n = Number(s.trim());
        return Number.isFinite(n) ? n : undefined;
      })
    : [];

  const companies: CompanyDetail[] = [];

  for (let i = 0; i < names.length; i++) {
    companies.push({
      company_name: names[i],
      bse_code: bse[i],
      nse_code: nse[i],
      market_cap: mcaps[i],
    });
  }

  return companies;
}

// -------------------------------------

function convertRssDateToIso(dateString: string): string {
  try {
    const date = new Date(dateString);

    // Check for invalid date
    if (isNaN(date.getTime())) {
      return new Date().toISOString(); // fallback
    }

    return date.toISOString();
  } catch {
    return new Date().toISOString(); // fallback on any unexpected error
  }
}

// -------------------------------------

// Extract the core processing logic into a reusable function
async function processSingleBlog(
  blog: {
    _id: Id<"blogs">;
    domain: string;
    imageUrl?: string;
    source?: string;
  },
  masterCompanyList: MasterCompany[]
) {
  console.log("\n--------------------------------------");
  console.log("📰 Fetching posts for:", blog.domain);

  const posts = await fetchHistoricalFromRSS(blog.domain);
  console.log(`✅ Total fetched: ${posts.length}`);

  const processedPosts: ConvexPost[] = [];

  for (const post of posts) {
    if (!post.author?.trim()) {
      console.log("⚠️ Skipping post without valid author:", post.title);
      continue;
    }

    console.log("\n📌 Processing Post:", post.title);

    const blogContent = (await fetchArticleContent(post.link)) || "";

    // Run agents
    const agent1 = await runAgent1(blogContent);
    console.log(agent1);

    const agent2 = await runAgent2(agent1.company);
    console.log(agent2);

    // Match companies
    const matched = matchCompaniesWithMasterList(
      agent2.candidates?.length > 0
        ? agent2.candidates
            .map((c: { original: string }) => c.original)
            .join(", ")
        : null,
      masterCompanyList
    );

    const companyDetails = parseMultiMatch(matched);
    console.log("🔍 Matched companies:", companyDetails);

    const convexPost: ConvexPost = {
      blogId: blog._id,
      title: post.title,
      link: post.link,
      pubDate: convertRssDateToIso(post.published),
      createdAt: Date.now(),
      author: post.author || undefined,
      image: post.image || undefined,
      imageUrl: blog.imageUrl || undefined,
      summary: agent1.summary || undefined,
      classification: agent1.classification || undefined,
      category: agent1.classification || undefined,
      tags: agent1.tags?.length > 0 ? agent1.tags : undefined,
      companyDetails: companyDetails.length > 0 ? companyDetails : undefined,
      source: blog.source || "",
    };

    if (companyDetails.length > 0) {
      convexPost.companyName = companyDetails
        .map((c) => c.company_name)
        .join(", ");
      convexPost.bseCode = companyDetails.map((c) => c.bse_code).join(", ");
      convexPost.nseCode = companyDetails.map((c) => c.nse_code).join(", ");
    }

    processedPosts.push(convexPost);
  }

  return processedPosts;
}

// New action for processing a single new blog
export const processNewBlogPosts = action({
  args: { blogId: v.id("blogs") },
  handler: async (ctx, { blogId }) => {
    const startTime = Date.now();

     try {
       // Fetch the blog
       const blog = await ctx.runQuery(api.functions.substackBlogs.getBlog, {
         blogId,
       });

       if (!blog) {
         console.log("❌ Blog not found");
         return;
       }

       // Fetch master company list
       console.log("📊 Fetching master company list…");
       const masterCompanyList = await ctx.runQuery(
         api.functions.masterCompanyList.getAllCompanies
       );

       // Process this single blog
       const processedPosts = await processSingleBlog(blog, masterCompanyList as MasterCompany[]);

       console.log(
         `✅ Processed ${processedPosts.length} posts for ${blog.domain}`
       );

       // Insert in batches of 100
       const BATCH_SIZE = 100;
       let batchNumber = 0;

       for (let i = 0; i < processedPosts.length; i += BATCH_SIZE) {
         const batch = processedPosts.slice(i, i + BATCH_SIZE);
         batchNumber++;

         console.log(
           `📤 Sending batch ${batchNumber} with ${batch.length} posts...`
         );

         await ctx.runMutation(api.functions.substackBlogs.addBulkPost, {
           posts: batch,
         });

         console.log(`✅ Batch ${batchNumber} inserted!`);
       }

       const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
       console.log(`\n🎉 Completed in ${duration} minutes`);
       console.log(`📊 Total posts: ${processedPosts.length}`);

       return {
         success: true,
         postsProcessed: processedPosts.length,
         duration,
       };
     } catch (err) {
       console.error("❌ Error processing blog:", err);
       throw err;
     }
   },
 });
