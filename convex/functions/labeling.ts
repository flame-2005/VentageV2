// convex/functions/labeling.ts
import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { api, internal } from "../_generated/api";

const openai = new OpenAI({
  apiKey:process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

// ACTION 1️⃣: Extract company info using OpenAI
export const extractCompanyAction = action({
  args: {
    postId: v.id("posts"),
    title: v.string(),
    link: v.string(),
  },
  handler: async (ctx, { postId, title, link }) => {
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

      “The upside case rests on Y’s dominant distribution flywheel and the shift of Z-category spend online, where the firm already captures ~18% share and expands gross margin through private-label mix.”

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
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const rawOutput = res.choices[0].message.content?.trim() || "{}";
      console.log("🤖 OpenAI raw response:", rawOutput);

      // Remove markdown code blocks if present
      const cleanOutput = rawOutput
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Parse JSON
      let parsed;
      try {
        parsed = JSON.parse(cleanOutput);
      } catch (parseErr) {
        console.error("❌ JSON parse failed:", parseErr);
        console.error("Raw output was:", cleanOutput);
        
        // Fallback: Create basic summary from title
        parsed = {
          title: title,
          summary: `Analysis of: ${title}`,
          company_name: null,
          bse_code: null,
          nse_code: null,
          category: "General",
          image_url: null,
        };
      }

      // Ensure summary is never empty
      if (!parsed.summary || parsed.summary.trim() === "") {
        parsed.summary = `Investment analysis: ${title}`;
      }

      console.log("✅ Parsed data:", parsed);

      // Update the post in Convex DB
      await ctx.runMutation(api.functions.substackBlogs.updatePost, {
        postId,
        data: {
          summary: parsed.summary || `Analysis: ${title}`, // Guaranteed summary
          companyName: parsed.company_name || undefined,
          bseCode: parsed.bse_code || undefined,
          nseCode: parsed.nse_code || undefined,
          category: parsed.category || "Uncategorized",
          imageUrl: parsed.image_url || undefined,
        },
      });

      console.log(`✅ Updated post ${postId} with extracted data`);
      return { success: true, data: parsed };

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