// convex/functions/labeling.ts
import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { api, internal } from "../_generated/api";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

// ACTION 1️⃣: Extract company info using OpenAI
export const extractCompanyAction = action({
  args: {
    postId: v.id("posts"),
    title: v.string(),
    link: v.string(),
  },
  handler: async (ctx, { postId, title, link }) => {
    // Helper function to fetch article content
    async function fetchArticleContent(url: string): Promise<string | null> {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; BlogAnalyzer/1.0)",
          },
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });

        if (!response.ok) {
          console.error(`❌ Failed to fetch ${url}: ${response.status}`);
          return null;
        }

        const html = await response.text();

        // Extract text content from HTML
        const textContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim();

        // Limit to first ~10000 chars to avoid token limits
        return textContent.slice(0, 10000);
      } catch (error) {
        console.error(`❌ Error fetching article:`, error);
        return null;
      }
    }

    function capitalizeWords(str: string) {
      return str
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    async function queryCompanyByName(companyName: string) {
      const normalizedName = companyName.toLowerCase().trim();

      const results = await ctx.runQuery(
        api.functions.masterCompanyList.getByName,
        {
          name: normalizedName,
        }
      );

      if (results && results.length > 0) {
        return results[0];
      }
      return null;
    }

    function matchCompaniesWithIndex(
      extractedCompanies: string | null
    ): string[] {
       if (extractedCompanies === null) {
        return [];
      }

      const companyNames = extractedCompanies
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      // Return matched companies for async processing
      return companyNames;
    }

    console.log(`🔍 Fetching content from: ${link}`);

    // FETCH THE ACTUAL ARTICLE CONTENT
    const articleContent = await fetchArticleContent(link);

    if (!articleContent) {
      console.error(`❌ Could not fetch content for ${link}`);

      await ctx.runMutation(api.functions.substackBlogs.updatePost, {
        postId,
        data: {
          summary: `Unable to analyze: ${title}`,
          category: "Uncategorized",
        },
      });

      return {
        success: false,
        error: "Failed to fetch article content",
      };
    }

    const prompt = `
You are an expert AI system designed to analyze and summarize blog posts related to finance, startups, technology, and business.

      Your task:
      1. Visit the provided URL.
      2. You are a world-class fundamental equity analyst summarizing an investment-thesis blog post.

      Your task:
      Produce a 1–2 line, punchy, high-signal summary that synthesizes:
      The core investment thesis (what drives the business, why it can win, what the edge is)
      The most important supporting facts (numbers, segment trends, TAM, catalysts, or risks)
      Rules:
      No fluff. No adjectives. No generic praise.
      Focus only on the core driver of long-term value outlined in the piece.
      Include a hard fact or directional data point if the blog provides it (e.g., segment growth, margins, TAM, unit economics, or structural tailwind).
      Avoid storytelling and avoid describing the article itself.
      Don’t repeat the company intro or “what the business does” unless it is essential to the thesis.
      Assume the goal is to help a sophisticated investor quickly assess whether the underlying work is high-quality and worth clicking.

      Output format:
      → One or two sentences. Max 40 words.
      → Direct, analytical, thesis-first.

      Example style:

      “Company X’s thesis hinges on its 70%+ recurring revenue cloud segment compounding at 30% YoY, giving it operating leverage toward mid-20s margins as legacy businesses shrink.”

      “The upside case rests on Y’s dominant distribution flywheel and the shift of Z-category spend online, where the firm already captures ~18% share and expands gross margin through private-label mix.”

      3. Identify and extract the Company Name, BSE Code, NSE Code if possible.
      4. If no company, provide a relevant Industry/Topic.
      5. Extract featured image URL if available.

      Return in this JSON format:
      {
        "title": "Title of the blog post",
        "summary": "2–3 line summary",
        "company_name": "Company name or null",
        "bse_code": "BSE code or null",
        "nse_code": "NSE code or null",
        "category": "Industry or topic",
        "image_url": "featured image URL or null"
      }

      Title: ${title}
      Link: ${link}
    `.trim();
    try {
      console.log(`🤖 Sending to OpenAI...`);

      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const raw = res.choices[0].message.content?.trim() || "{}";
      console.log(`✅ Received response from OpenAI`);

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (parseError) {
        console.error("❌ JSON parse error:", parseError);
        parsed = {
          title,
          summary: `Analysis of: ${title}`,
          company_name: null,
          bse_code: null,
          nse_code: null,
          category: "General",
          image_url: null,
        };
      }

      // Ensure summary is never empty
      if (!parsed.summary?.trim()) {
        parsed.summary = `Investment analysis: ${title}`;
      }

      console.log(`✅ Initial extraction:`, {
        company: parsed.company_name,
        category: parsed.category,
        summaryLength: parsed.summary?.length || 0,
      });

      const companyNamesToMatch = matchCompaniesWithIndex(parsed.company_name);

      const matchedCompanies: Array<{ company_name: string; bse_code: string | null; nse_code: string | null }> = [];

      for (const companyName of companyNamesToMatch) {
        const match = await queryCompanyByName(companyName);

        if (match) {
          matchedCompanies.push({
            company_name: match.name,
            bse_code: match.bse_code || null,
            nse_code: match.nse_code || null,
          });
          console.log(`✅ Matched: "${companyName}" → ${match.name}`);
        } else {
          const fallbackName = capitalizeWords(companyName);
          matchedCompanies.push({
            company_name: fallbackName,
            bse_code: null,
            nse_code: null,
          });
          console.log(
            `⚠️ No match for: "${companyName}" → Keeping as: "${fallbackName}"`
          );
        }
      }

      const matchedCompaniesResult = {
        company_name: matchedCompanies.map((c) => c.company_name).join(", ") || null,
        bse_code:
          matchedCompanies
            .map((c) => c.bse_code || "")
            .filter(Boolean)
            .join(", ") || null,
        nse_code:
          matchedCompanies
            .map((c) => c.nse_code || "")
            .filter(Boolean)
            .join(", ") || null,
      };

      console.log(`✅ After matching:`, {
        company: matchedCompaniesResult.company_name,
        bse_code: matchedCompaniesResult.bse_code,
        nse_code: matchedCompaniesResult.nse_code,
      });

        await ctx.runMutation(api.functions.substackBlogs.updatePost, {
        postId,
        data: {
          summary: parsed.summary,
          companyName: matchedCompaniesResult.company_name || undefined,
          bseCode: matchedCompaniesResult.bse_code || undefined,
          nseCode: matchedCompaniesResult.nse_code || undefined,
          category: parsed.category || "Uncategorized",
          imageUrl: parsed.image_url || undefined,
        },
      });

      console.log(`✅ Updated post ${postId} with extracted data`);

      return {
        success: true,
        data: {
          title: parsed.title,
          summary: parsed.summary,
          company_name: matchedCompaniesResult.company_name,
          bse_code: matchedCompaniesResult.bse_code,
          nse_code: matchedCompaniesResult.nse_code,
          category: parsed.category,
          image_url: parsed.image_url,
        },
      };
    } catch (error) {
      console.error("❌ OpenAI API error:", error);

      // Even on error, try to save a basic summary
      await ctx.runMutation(api.functions.substackBlogs.updatePost, {
        postId,
        data: {
          summary: `Investment thesis: ${title}`,
          category: "Uncategorized",
        },
      });

      return { success: false, error: String(error) };
    }
  },
});

// ACTION 2️⃣: Label all posts in entire database (recursive pagination)
// export const labelAllCompanies = internalAction({
//   args: {
//     cursor: v.optional(v.string()),
//     forceReprocess: v.optional(v.boolean()),
//   },
//   handler: async (ctx, args) => {
//     const limit = 20;
//     const cursor = args.cursor;
//     const forceReprocess = args.forceReprocess ?? false;

//     console.log("🔍 Starting batch with cursor:", cursor || "initial");
//     console.log("🔄 Force reprocess:", forceReprocess);

//     const result = await ctx.runQuery(
//       api.functions.substackBlogs.getPaginatedPosts,
//       {
//         numItems: limit,
//         cursor,
//       }
//     );

//     console.log("📊 Query result:", {
//       pageLength: result?.page?.length || 0,
//       hasContinueCursor: !!result?.continueCursor,
//       isDone: result?.isDone,
//     });

//     if (!result?.page?.length) {
//       console.log("✅ No more posts found. All labeling complete!");
//       return;
//     }

//     let scheduledCount = 0;
//     for (const post of result.page) {
//       // Process if: forcing reprocess OR missing summary OR missing category
//       const needsProcessing =
//         forceReprocess ||
//         !post.summary ||
//         !post.category ||
//         post.summary === "unset" ||
//         post.category === "unset";

//       if (needsProcessing) {
//         await ctx.scheduler.runAfter(
//           0,
//           api.functions.labeling.extractCompanyAction,
//           {
//             postId: post._id,
//             title: post.title,
//             link: post.link,
//           }
//         );
//         scheduledCount++;
//       }
//     }

//     console.log(
//       `📦 Processed ${result.page.length} posts, scheduled ${scheduledCount} for labeling`
//     );

//     if (result.continueCursor) {
//       console.log("🔄 Scheduling next batch with cursor:", result.continueCursor);
//       await ctx.scheduler.runAfter(
//         2000, // 2 second delay between batches
//         internal.functions.labeling.labelAllCompanies,
//         {
//           cursor: result.continueCursor,
//           forceReprocess,
//         }
//       );
//     } else {
//       console.log(
//         "🎉 All posts in the database have been scheduled for labeling!"
//       );
//     }
//   },
// });

// Create a public action to trigger the internal one
// export const startLabelingAllCompanies = action({
//   args: {
//     forceReprocess: v.optional(v.boolean()),
//   },
//   handler: async (ctx, args) => {
//     const forceReprocess = args.forceReprocess ?? false;

//     await ctx.scheduler.runAfter(
//       0,
//       internal.functions.labeling.labelAllCompanies,
//       {
//         cursor: undefined,
//         forceReprocess,
//       }
//     );

//     return {
//       message: "Labeling process started!",
//       forceReprocess,
//       note: "Check Convex dashboard logs for progress"
//     };
//   },
// });
