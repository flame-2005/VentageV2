// convex/agent1.ts
import OpenAI from "openai";
import { v } from "convex/values";
import { action } from "../../../_generated/server";
import { Agent1Response } from "../../../constant/posts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set this in Convex dashboard
});

export const runAgent1 = action({
  args: {
    blogText: v.string(),
  },
  handler: async (ctx, { blogText }): Promise<Agent1Response> => {
    const systemPrompt = `
You are Agent 1 — an expert financial blog classifier specializing in equity research, sector studies, and investment commentary.

Your role is to analyze the provided blog text and classify it into exactly ONE of the following 5 categories and give detailed  summary.

You are a world-class fundamental equity analyst summarizing an investment-thesis blog post.

      for  summary
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

      “The upside case rests on Y’s dominant distribution flywheel and the shift of Z-category spend online, where the firm already captures ~18% share and expands gross margin through private-label mix.”


      
Apply professional judgment, similar to an equity research analyst assessing the intent and depth of a report.

When extracting "company", include ONLY real business entities.
Do NOT extract:
- IITs or universities
- Indian Navy / Army / Air Force
- government departments
- ministries
- NGOs
- educational or research institutes
- political or administrative bodies

────────────────────────────────────────
📌 CATEGORY DEFINITIONS (VERY STRICT)
────────────────────────────────────────

1. Multiple_company_update
   - The blog contains brief updates on several companies.
   - Typically 1–2 sentences per company.
   - Focus is on short-term events or factual updates.
   - No narrative, no deep reasoning, no structured analysis.
   - Example topics: results date reminders, board meeting notes, short operational updates.

   Example Output:
   {
     "classification": "Multiple_company_update",
     "company": ["TCS", "Infosys", "Reliance"],
     "sector": "",
     "tags": ["neutral"],
     "category": "multiple"
     "summary": "The upside case rests on Y’s dominant distribution flywheel and the shift of Z-category spend online, where the firm already captures ~18% share and expands gross margin through private-label mix."
   }

────────────────────────────────────────

2. Multiple_company_analysis
   - The blog provides shallow to moderately detailed commentary on multiple companies.
   - Typically 3–6 lines per company.
   - Analysis includes light reasoning: opportunities, risks, general thesis, or quick takeaways.
   - Not deep enough to be considered a full analysis of any single company.

   Example Output:
   {
     "classification": "Multiple_company_analysis",
     "company": ["ITC", "HUL", "Nestle"],
     "sector": "",
     "tags": ["moderately_bullish"],
     "category": "multiple"
      "summary": "The upside case rests on Y’s dominant distribution flywheel and the shift of Z-category spend online, where the firm already captures ~18% share and expands gross margin through private-label mix."
   }

────────────────────────────────────────

3. Sector_analysis
   - A deep dive into one specific sector or industry.
   - The blog explains structural trends, competitive dynamics, regulatory environment, growth levers, etc.
   - Mentions companies only as examples supporting the sector narrative.
   - The sector is clearly the focus, not individual stocks.

   Example Output:
   {
     "classification": "Sector_analysis",
     "company": ["Sun Pharma", "Cipla", "Lupin"],
     "sector": "Pharmaceuticals",
     "tags": ["bullish_on_sector"],
     "category": "sector"
      "summary": "The upside case rests on Y’s dominant distribution flywheel and the shift of Z-category spend online, where the firm already captures ~18% share and expands gross margin through private-label mix."
   }

────────────────────────────────────────

4. Company_analysis
   - A deep dive on ONE specific company only.
   - Includes structured, detailed research such as:
     • Business model  
     • Financial performance  
     • Competitive advantages  
     • Risks  
     • Valuation commentary  
     • Forward outlook  
   - No other company receives meaningful analysis.

   Example Output:
   {
     "classification": "Company_analysis",
     "company": ["HDFC Bank"],
     "sector": "Banking",
     "tags": ["bullish"],
     "category": "company"
      "summary": "The upside case rests on Y’s dominant distribution flywheel and the shift of Z-category spend online, where the firm already captures ~18% share and expands gross margin through private-label mix."
   }

────────────────────────────────────────

5. General_investment_guide
   - The blog provides generalized investment knowledge.
   - Not about any specific company or sector.
   - Examples: portfolio construction, asset allocation, risk management, SIPs, investing psychology, long-term strategy.

   Example Output:
   {
     "classification": "General_investment_guide",
     "company": [],
     "sector": "",
     "tags": ["educational"],
     "category": "general"
      "summary": "The upside case rests on Y’s dominant distribution flywheel and the shift of Z-category spend online, where the firm already captures ~18% share and expands gross margin through private-label mix."
   }


────────────────────────────────────────
⚠ IMPORTANT INSTRUCTIONS
────────────────────────────────────────
- ALWAYS return ONLY the JSON object.
- Do NOT include explanations, commentary, or reasoning.
- Extract company names and sector names ONLY if the category requires it.
- All tags must be sentiment-style keywords such as:
  ["bullish", "bearish", "neutral", "positive", "negative", "cautious", "speculative"]

────────────────────────────────────────
END OF SYSTEM PROMPT
────────────────────────────────────────
`;

    const userPrompt = `
Read the blog content below and classify it into exactly ONE of the 5 predefined categories.

Your output must follow this strict JSON format:
{
  "classification": "",
  "company": [],
  "sector": "",
  "tags": [],
  "category": ""
  "summary":""
}

Where:
- "classification" = one of:
    "Multiple_company_update",
    "Multiple_company_analysis",
    "Sector_analysis",
    "Company_analysis",
    "General_investment_guide"

- "company" = array of company names mentioned in the blog (raw names, no codes)

- "sector" = detected sector name (empty if none applies)

- "tags" = sentiment-style tags such as:
    "bullish", "bearish", "neutral", "positive", "negative", "cautious", "speculative"

- "category" = one of:
    "multiple", "sector", "company", "general"
  (based on the classification)

Return ONLY the JSON object.
No explanations. No notes. No reasoning.

────────────────────────────────────────
📄 BLOG CONTENT:
"""
${blogText}
"""
────────────────────────────────────────
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned no content");
    }

    let parsed: Agent1Response;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      // Optional: log full content to Convex logs for debugging
      console.error("Failed to parse Agent1 JSON:", content);
      throw new Error("Model did not return valid JSON");
    }

    return parsed;
  },
});
