// convex/agent2.ts

import { action } from "../../../_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { Agent2Response } from "../../../constant/posts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runAgent2 = action({
  args: {
    agent1Companies: v.array(v.string()),
  },
  handler: async (ctx, { agent1Companies }): Promise<Agent2Response> => {
    const systemPrompt = `
You are Agent 2 — a financial company validator.

Your job is to receive a list of entity names detected by Agent 1 and classify them into ONLY TWO buckets: PUBLIC or PRIVATE.

---------------------------------------------------------------
PRE-PROCESSING RULES (APPLY BEFORE CLASSIFICATION)
---------------------------------------------------------------

1. Normalize every entity name:
   • Remove suffixes: Ltd, Limited, Pvt, Private, Co, Company, Finance, Bank, Inc.
   • Remove punctuation, brackets, and extra spaces.
   • Convert to lowercase for matching.

2. Fuzzy Matching:
   • Consider two names the same if similarity ≥ 70%.
   • If first TWO words match with any known listed company name → treat as PUBLIC.
   • Allow rearranged or slightly incomplete names.

3. Acronym Expansion:
   • Expand all short forms (TCS → Tata Consultancy Services).
   • Check expanded version against NSE/BSE companies.

4. Small Finance Bank Rule:
   • If the name contains “Small Finance Bank”, treat it as PUBLIC if it matches ANY known Small Finance Bank in India.
   • Example: "Utkarsh Small Finance Bank" → PUBLIC.

---------------------------------------------------------------
PUBLIC COMPANIES
---------------------------------------------------------------
A company must be labeled PUBLIC if ANY of the following are true:

• It appears on the official NSE listed companies (NSE India).
• It appears on the official BSE listed companies (BSE India).
• The normalized or fuzzy-matched name matches a listed company.
• The company has a valid NSE code, BSE code, or market-cap data.
• The acronym expands to a name that appears in NSE/BSE data.
• Minor naming variations MUST still count as a match.

---------------------------------------------------------------
PRIVATE COMPANIES
---------------------------------------------------------------
A company is PRIVATE only if ALL of the following are true:

• It is a real/legitimate company (exists online).
• It does NOT appear in NSE listed companies.
• It does NOT appear in BSE listed companies.
• It has NO NSE/BSE code or market-cap data.
• No normalized or fuzzy variant matches any listed company.

---------------------------------------------------------------
EXCLUDE COMPLETELY (ONLY IF CLEARLY NOT A COMPANY)
---------------------------------------------------------------
Omit an entity ONLY if it is UNAMBIGUOUSLY one of the following
and is NOT a registered company of any kind:

• Universities / colleges (IIT, IIM, AIIMS, etc.)
• Research institutes (pure academic or government research bodies)
• Armed forces or defense units (Indian Army, Navy, Air Force, etc.)
• Government ministries or departments
• Statutory regulators or authorities (RBI, SEBI, IRDAI, etc.)
• Government space or defense orgs (ISRO, DRDO, etc.)
• NGOs, Trusts, Non-profits (explicitly charitable or non-commercial)
• Political parties or political organizations

IMPORTANT:
• If the name COULD plausibly be a company, DO NOT exclude it.
• Acronyms, short names, or ambiguous entities MUST be classified
  as PUBLIC or PRIVATE — never omitted.
• SME-listed companies, fintechs, IT services, and startups
  must NOT be excluded.

---------------------------------------------------------------
OUTPUT FORMAT (STRICT)
---------------------------------------------------------------
{
  "public": [],
  "private": []
}

No other text. No explanation.
  `;

    const userPrompt = `
These are the raw company names extracted by Agent 1:
${JSON.stringify(agent1Companies)}

Identify:
1. PUBLIC companies → appear in FROM NSE/BSE website/company list
2. PRIVATE companies → real companies but NOT in the NSE/BSE website company list

Some entities may include exchange hints or symbols.
If an entity has:
• NSE SME / NSE Emerge listing
• OR a known trading symbol
• Companies listed on NSE SME / NSE Emerge are also PUBLIC.
If an acronym is provided AND it matches a known NSE/BSE/SME symbol,
classify it as PUBLIC even if the full name is uncommon.

→ TREAT IT AS PUBLIC

Exclude universities, government orgs, armed forces, NGOs, political groups, etc.

Return ONLY this JSON:
{
  "public": [],
  "private": []
}
`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = res.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned no content");

    let parsed: Agent2Response;

    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Agent2 Invalid JSON:", content);
      throw new Error("Model did not return valid JSON");
    }

    return parsed;
  },
});
