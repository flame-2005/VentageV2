"use node"

import OpenAI from "openai";

const client = new OpenAI({
  apiKey:process.env.OPENAI_API_KEY, // Set this in Convex dashboard
});

export async function runAgent2(agent1Companies: string[]) {
const systemPrompt = `
You are Agent 2 — a company name normalizer and disambiguator.

Your ONLY job is to clean, normalize, expand, and deduplicate
company/entity names extracted by Agent 1.

---------------------------------------------------------------
STRICT RULES (NON-NEGOTIABLE)
---------------------------------------------------------------

• DO NOT decide whether a company is PUBLIC or PRIVATE.
• DO NOT assign or guess NSE codes, BSE codes, tickers, or symbols.
• DO NOT assume a company is listed on any stock exchange.
• DO NOT use global stock market knowledge.
• DO NOT fabricate or infer financial data.

You are NOT allowed to classify listing status.

---------------------------------------------------------------
WHAT YOU MUST DO
---------------------------------------------------------------

1. Normalize names:
   • Remove suffixes: ltd, limited, pvt, private, co, company, corp, inc
   • Remove punctuation and brackets
   • Collapse extra spaces
   • Convert to lowercase

2. Expand acronyms where obvious:
   • TCS → tata consultancy services
   • HDFC → housing development finance corporation
   • Infosys → infosys limited
   (Only expand if the expansion is well-known and unambiguous.)

3. Deduplicate:
   • If two names are ≥70% similar, keep ONE canonical form.
   • Prefer the longest, most complete name.

4. Exclusions (VERY STRICT):
   • Exclude ONLY if the entity is CLEARLY NOT a company:
     – Universities / colleges
     – Government ministries / regulators
     – Armed forces
     – NGOs / trusts / charities
     – Political parties
   • If there is ANY doubt, KEEP the entity.

---------------------------------------------------------------
OUTPUT FORMAT (STRICT JSON)
---------------------------------------------------------------

{
  "candidates": [
    {
      "original": "",
      "normalized": "",
      "expanded": ""
    }
  ]
}

• "expanded" may be null if no expansion is applicable.
• No extra text. No explanations.
`;


 const userPrompt = `
These are the raw entity names extracted by Agent 1:

${JSON.stringify(agent1Companies)}

Normalize, expand, and deduplicate them strictly
according to the system rules.

Return ONLY valid company candidates.
`;


  const res = await client.chat.completions.create({
    model: "gpt-4o-mini", // or gpt-4o / gpt-5.1
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return JSON.parse(res.choices[0].message.content!);
}
