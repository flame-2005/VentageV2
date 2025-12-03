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
You are a world-class fundamental equity analyst summarizing an investment-thesis blog post.

Your task:
1. Read the article content provided below.
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
      → One or two sentences. Max 60 words.
      → Direct, analytical, thesis-first.

      Example style:

      “Company X’s thesis hinges on its 70%+ recurring revenue cloud segment compounding at 30% YoY, giving it operating leverage toward mid-20s margins as legacy businesses shrink.”

      “The upside case rests on Y’s dominant distribution flywheel and the shift of Z-category spend online, where the firm already captures ~18% share and expands gross margin through private-label mix.”


3. Identify companies:
   - If multiple companies are discussed, list ALL of them separated by commas
   - Only include REAL commercial companies (not institutions)
   - If the article is sector-focused without specific companies, set company to []

4. Identify the sector/industry (Technology, Pharma, Banking, etc.)

5. Classify the blog into exactly ONE of the 5 categories below.

Return ONLY valid JSON with this structure:
{
  "classification": "",
  "company": [],
  "sector": "",
  "tags": [],
  "category": "",
  "summary": ""
}

Article Title: ${title}

Article Content:
${articleContent}

────────────────────────────────────────
📌 DO NOT extract non-commercial entities:
────────────────────────────────────────
Exclude:
- IITs, IIMs, universities
- Indian Navy, Army, Air Force
- Ministries, Gov departments
- NGOs, research institutes
- Political entities

────────────────────────────────────────
📌 CATEGORY DEFINITIONS (STRICT, WITH EXAMPLES INCLUDING SUMMARY)
────────────────────────────────────────

1. Multiple_company_update
   - Short factual updates on multiple companies (1–2 lines each)
   - No analysis or thesis

   Example Output:
   {
     "classification": "Multiple_company_update",
     "company": ["TCS", "Infosys", "Reliance"],
     "sector": "",
     "tags": ["neutral"],
     "category": "multiple",
     "summary": "Large-cap IT names released event updates with no material thesis or directional financial impact."
   }

────────────────────────────────────────

2. Multiple_company_analysis
   - Shallow to moderate analysis (3–6 lines per company)
   - Light reasoning across several businesses

   Example Output:
   {
     "classification": "Multiple_company_analysis",
     "company": ["ITC", "HUL", "Nestle"],
     "sector": "",
     "tags": ["moderately_bullish"],
     "category": "multiple",
     "summary": "FMCG players show margin stability and volume recovery, supported by rural demand improvement and cost moderation."
   }

────────────────────────────────────────

3. Sector_analysis
   - Deep dive on an entire industry or sector
   - Companies only as examples supporting the sector thesis

   Example Output:
   {
     "classification": "Sector_analysis",
     "company": ["Sun Pharma", "Cipla", "Lupin"],
     "sector": "Pharmaceuticals",
     "tags": ["bullish_on_sector"],
     "category": "sector",
     "summary": "US generics shortages and domestic chronic growth strengthen long-term profitability for leading pharma exporters."
   }

────────────────────────────────────────

4. Company_analysis
   - Deep research into ONE company
   - Covers financials, risks, valuations, competitive position

   Example Output:
   {
     "classification": "Company_analysis",
     "company": ["HDFC Bank"],
     "sector": "Banking",
     "tags": ["bullish"],
     "category": "company",
     "summary": "Stable NIMs, superior asset quality, and sustained loan growth support compounding ROE for HDFC Bank."
   }

────────────────────────────────────────

5. General_investment_guide
   - Pure education about investing
   - Not about a sector or company

   Example Output:
   {
     "classification": "General_investment_guide",
     "company": [],
     "sector": "",
     "tags": ["educational"],
     "category": "general",
     "summary": "Disciplined SIP allocations and diversified portfolios reduce volatility and improve long-term risk-adjusted returns."
   }

────────────────────────────────────────
📌 SENTIMENT TAGS
────────────────────────────────────────
Use only:
["bullish", "bearish", "neutral", "positive", "negative", "cautious", "speculative"]

────────────────────────────────────────
⚠ IMPORTANT
────────────────────────────────────────
- ALWAYS return ONLY the JSON object.
- No commentary, no steps, no explanation, no markdown.
- Extract companies and sectors ONLY if the category requires it.

────────────────────────────────────────
END OF SYSTEM PROMPT
────────────────────────────────────────


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

      const matchedCompanies: Array<{
        company_name: string;
        bse_code: string | null;
        nse_code: string | null;
      }> = [];

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
        company_name:
          matchedCompanies.map((c) => c.company_name).join(", ") || null,
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
