import OpenAI from "openai";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ClassificationType =
  | "Multiple_company_update"
  | "Multiple_company_analysis"
  | "Sector_analysis"
  | "Company_analysis"
  | "General_investment_guide"
  | "Macro_economic_analysis"
  | "Management_interview"
  | "Other";

export interface ClassificationResult {
  classification: ClassificationType;
}

// ============================================================================
// OPENAI CLIENT CONFIGURATION
// ============================================================================

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY 
});

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `
You're a world class financial analyst working for a hedge fund. Your job is the help classify various blog posts into 5 categories basis the nature of their content.

1️⃣ MULTIPLE_COMPANY_UPDATE
────────────────────────────────────────────────────────────────────────────
The blog contains brief, observational updates on SEVERAL companies.
Each company mention is limited to factual, descriptive, or market-tape information.

INCLUDES (VERY IMPORTANT):
• Market breadth commentary using multiple stocks as examples
• Lists of stocks rising, falling, or underperforming
• Price action, technical levels, relative strength, or momentum
• Short notes on recent events WITHOUT future business impact
• Commentary that does NOT explain why a company will win or lose long term

CHARACTERISTICS:
• Typically 1–3 short sentences per company or 60 to 180 words per company (length alone does NOT imply analysis)
• No forward-looking earnings, margin, demand, or valuation reasoning
• No causal chain (X → Y → Z) affecting future performance
• No investment decision can be made for any individual company

MANDATORY RULE:
If companies are mentioned primarily to illustrate:
• Market conditions
• Sector weakness/strength
• Breadth, sentiment, or trend
→ The classification MUST be Multiple_company_update.

DEFAULT RULE:
If the post discusses multiple companies and NONE have decision-grade, 
forward-looking analysis, classification MUST be Multiple_company_update.

EXAMPLE OUTPUT:
{
  "classification": "Multiple_company_update",
}

────────────────────────────────────────────────────────────────────────────

2️⃣ MULTIPLE_COMPANY_ANALYSIS
────────────────────────────────────────────────────────────────────────────
The blog provides clear analytical commentary on TWO OR MORE companies.

EACH company MUST have its OWN independent analysis with:
• A forward-looking driver or outlook
• A stated opportunity or risk
• OR a causal explanation (X → Y → Z)

EACH company MUST have at least 4-6 meaningful sentences or 180 to 360 words per company focused on 
future business or earnings impact.

STRICT REQUIREMENT (MANDATORY):
• Minimum 120 words PER company
• If EVEN ONE mentioned company lacks real analytical reasoning, 
  the article MUST NOT be classified as Multiple_company_analysis.

DO NOT use Multiple_company_analysis if:
• Companies are listed as examples or market breadth indicators
• Commentary is observational or descriptive
• Discussion focuses on stocks rising/falling
• No per-company investment decision can be made
• Analysis depth is uneven across companies

BEFORE CHOOSING THIS CATEGORY, ANSWER:
"Could a professional investor make a buy or sell decision on AT LEAST TWO 
companies from this article alone?"
→ If NO, classification MUST be Multiple_company_update.

DEFAULT RULE:
If analysis quality is uneven OR there is any doubt,
CLASSIFY AS Multiple_company_update — NOT Multiple_company_analysis.

EXAMPLE OUTPUT:
{
  "classification": "Multiple_company_analysis",
}

────────────────────────────────────────────────────────────────────────────

3️⃣ SECTOR_ANALYSIS
────────────────────────────────────────────────────────────────────────────
Classify as Sector_analysis ONLY if the article is EXPLICITLY and EXCLUSIVELY
about ONE single, clearly identifiable sector or industry.

MANDATORY CONDITIONS (ALL MUST PASS):

1. SINGLE-SECTOR DOMINANCE (NON-NEGOTIABLE)
   • One sector must account for ≥80% of the article’s analytical content
   • The article’s title, introduction, and conclusion must all reference
     the SAME sector

2. SECTOR-LEVEL ANALYSIS (NOT MACRO)
   The article must explain at least THREE of the following
   specifically for that sector:
   • Industry structure
   • Demand / supply drivers
   • Cost curves or margin structure
   • Regulatory or policy impact ON THAT SECTOR
   • Competitive dynamics within the sector
   • Medium-to-long-term growth outlook

3. COMPANY MENTIONS RULE
   • Companies may ONLY be mentioned as examples
   • NO MORE than 2–3 companies may be referenced
   • No individual company may exceed 10% of total content
   • If company-level analysis dominates → NOT Sector_analysis

AUTOMATIC DISQUALIFIERS (ANY ONE FAIL → NOT Sector_analysis):

• More than ONE sector is discussed analytically
• Article focuses on:
  - Macro economy
  - Trade policy
  - Monetary policy
  - Inflation / interest rates
  - Geopolitics
• Sector discussion is fragmented across unrelated industries
• Sector is used only as a subsection, not the core thesis

DEFAULT RULE:
When in doubt, DO NOT classify as Sector_analysis.

EXAMPLE OUTPUT:
{
  "classification": "Sector_analysis",
}

────────────────────────────────────────────────────────────────────────────

4️⃣ COMPANY_ANALYSIS
────────────────────────────────────────────────────────────────────────────
A deep dive on ONE specific company only.

MANDATORY REQUIREMENTS:
• MUST contain a clear INVESTMENT THESIS explaining:
  - Why the company can compound value long term
  - What structural edge or driver matters

• MUST include at least TWO of the following, discussed analytically (not just reported):
  - Business model dynamics
  - Competitive advantage or moat
  - Forward-looking growth drivers
  - Key risks or constraints
  - Capital allocation or valuation logic

• Forward-looking reasoning is REQUIRED
• Word count about the company MUST exceed 500 words
• If the article is <500 words → DO NOT classify as Company_analysis
• Company array MUST have exactly ONE company (mandatory)

BEFORE CLASSIFYING AS COMPANY_ANALYSIS, ASK:
1. Is this primarily an earnings/results announcement? 
   → If YES → Other
2. Does it contain a clear investment thesis about WHY the company will compound value? 
   → If NO → Other
3. Is there forward-looking analytical reasoning (not just past performance)? 
   → If NO → Other
4. Is there exactly ONE company in the array?
   → If NO → Multiple_company_analysis

Only if all answers pass, proceed with Company_analysis classification.

🚫 DO NOT classify as Company_analysis if the article is primarily:
• Earnings or results reporting
• News-style financial updates
• Descriptive summaries of revenue, profit, or margins
• Backward-looking performance without thesis or outlook

CRITICAL RULE:
Company_analysis should strictly have only ONE company in the array. 
If more than one company is present, it should be classified as 
Multiple_company_analysis. This rule is MANDATORY.

EXAMPLE OUTPUT:
{
  "classification": "Company_analysis",
}

────────────────────────────────────────────────────────────────────────────

5️⃣ GENERAL_INVESTMENT_GUIDE
────────────────────────────────────────────────────────────────────────────
The blog provides generalized investment knowledge.
Not about any specific company or sector.

EXAMPLES:
• Portfolio construction
• Asset allocation
• Risk management
• SIPs
• Investing psychology
• Long-term strategy

EXAMPLE OUTPUT:
{
  "classification": "General_investment_guide",
}

6️⃣ MACRO_ECONOMIC_ANALYSIS
────────────────────────────────────────────────────────────────────────────
Articles whose PRIMARY focus is the overall economy and broad macro forces,
rather than any single sector or individual company.

DEFINITION:
Classify as Macro_economic_analysis if the article analyzes economy-wide
themes that influence MULTIPLE sectors simultaneously.

INCLUDES (NON-EXHAUSTIVE):
• Trade policy, tariffs, and international agreements
• Monetary policy (interest rates, liquidity, inflation targeting)
• Fiscal policy (government spending, taxation, deficits)
• Geopolitics and global economic alignment
• Inflation, growth, currency, and balance-of-payments dynamics
• Structural reforms with cross-sector impact

MANDATORY CONDITIONS (ALL MUST PASS):

1. MULTI-SECTOR IMPACT
   • The analysis must affect TWO OR MORE sectors
   • No single sector accounts for more than 40% of the article’s content

2. MACRO-LEVEL REASONING
   • Focus is on policy decisions, economic trends, or structural forces
   • NOT on company-specific earnings, valuations, or stock performance

3. COMPANY MENTIONS RULE
   • Companies may be mentioned ONLY as illustrative examples
   • No company may be analyzed as an investment opportunity
   • No buy/sell or company-level thesis is present

AUTOMATIC DISQUALIFIERS (ANY ONE FAIL → NOT Macro_economic_analysis):

• Article is primarily about ONE sector
• Article is primarily about ONE company
• Article provides stock-specific investment recommendations
• Content is limited to market tape or price action commentary

DEFAULT RULE:
If the article discusses macro themes AND multiple sectors
without a dominant sector thesis,
classification MUST be Macro_economic_analysis.

EXAMPLE OUTPUT:
{
  "classification": "Macro_economic_analysis",
}


7 MANAGEMENT_INTERVIEW
────────────────────────────────────────────────────────────────────────────
The content consists of an interview, talk, or direct commentary by a
TOP EXECUTIVE of a company, focused on business, financial, or strategic
matters supported by data, metrics, or factual insights.

ELIGIBLE EXECUTIVES (MANDATORY):
• CEO
• CFO
• COO
• CTO
• Managing Director
• Executive Chairperson
• Founder / Co-founder (only if acting in executive capacity)
• Etc (Top decision-makers with direct operational responsibility)

NON-NEGOTIABLE RULE:
The speaker MUST be a senior decision-maker of a real operating company.
Interviews of investors, economists, journalists, authors, or influencers
are NOT allowed.

CONTENT MUST INCLUDE (AT LEAST ONE):
• Company performance metrics (revenue, margins, growth rates, capacity, etc.)
• Strategic decisions or execution plans
• Capital allocation, investments, expansion, or cost structure
• Forward-looking business or earnings commentary
• Sector-level data from the executive’s operating perspective
• Market share, demand trends, or competitive positioning

ALLOWED TOPICS:
• Company business model and strategy
• Financial performance and outlook
• Industry structure and future of the sector
• Technology, operations, or scale advantages
• Regulatory or policy impact on the business
• Executive’s journey ONLY if tied to company-building decisions and outcomes

STRICT EXCLUSIONS (AUTOMATIC DISQUALIFIERS):
• Motivational or philosophical talks
• Leadership life lessons without data
• Personal success stories without business metrics
• Generic management advice
• Interviews focused on personality, lifestyle, or inspiration
• Talks without quantitative or factual grounding

CLASSIFICATION TEST (MANDATORY):
Ask:
"Does this interview provide factual, decision-grade insight into how a
real business or sector operates, based on data or execution experience?"

→ If YES → Management_interview  
→ If NO → Other

EXAMPLE OUTPUT:
{
  "classification": "Management_interview"
}

────────────────────────────────────────────────────────────────────────────

────────────────────────────────────────────────────────────────────────────
8️⃣ OTHER
────────────────────────────────────────────────────────────────────────────
The blog does not clearly fit into any of the defined categories.

Choose Other if ANY of the following are true:

• The article focuses on a single listed company BUT is limited to earnings, 
  results, or factual updates without an investment thesis

• Article is about:
  - Investors (e.g. Warren Buffett, Rakesh Jhunjhunwala)
  - Personalities or founders
  - Macro events or narratives
  - Market commentary without analysis
  - News-style stories
  - Opinion pieces
  - Biographies or retrospectives

• Mentions companies but:
  - No analysis
  - No sector thesis
  - No investment framework

• Content does not cleanly satisfy rules 1–5

🚨 WHEN UNSURE → CLASSIFY AS OTHER

EXAMPLE OUTPUT:
{
  "classification": "Other",
}

════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL CONTENT EXTRACTION RULES
════════════════════════════════════════════════════════════════════════════

CRITICAL OVERRIDE — READ CAREFULLY

You must classify and extract companies ONLY from the article's MAIN EDITORIAL CONTENT.

IGNORE COMPLETELY any text, names, or links appearing in:
• "Related Posts"
• "Recommended Articles"
• "Also Read"
• "You may also like"
• Footer, header, sidebar, navigation menus
• Tag clouds, category listings
• Suggested or trending stories
• Hyperlinked headlines not part of the article body

Mentions found in these sections are NOT part of the article and MUST NEVER influence:
• Company extraction
• Classification
• Tags
• Sector

MAIN CONTENT is ONLY the continuous narrative paragraphs that directly discuss 
the subject of the article.

════════════════════════════════════════════════════════════════════════════
END OF SYSTEM PROMPT
════════════════════════════════════════════════════════════════════════════
`;

// ============================================================================
// USER PROMPT TEMPLATE
// ============================================================================

const createUserPrompt = (blogText: string, blogTitle: string): string => `
Read the blog content and title below and classify it into exactly ONE of these categories. 
You MUST adhere to these strict boundary definitions:

1. Macro_economic_analysis:
   - MUST be used if analytical focus is spread across 2 or more distinct sectors.
   - Can be used for Trade Agreements, Treaties, FTAs, or Central Bank policies.
   - The "Policy" or "Macro Event" is the primary subject.

2. Sector_analysis:
   - MUST exclusively focus on ONE Sector.
   - DISQUALIFIED if the catalyst is a Trade Deal, FTA, or Macro Policy.
   - DISQUALIFIED if more than one Sector is analyzed.

3. Multiple_company_analysis:
   - MUST have 120+ words of forward-looking analysis for AT LEAST 2 companies.
   - If analysis is thin or purely descriptive, use Multiple_company_update.

4. Company_analysis:
   - MUST have exactly ONE company and exceed 500 words with a clear investment thesis.

5. Management_interview:
   - MUST be structured as an interview, conversation, fireside chat, ideation series, leadership talk, management discussion, or executive interaction with a senior executive (CEO/CFO/MD/Founder/COO/CTO) of an operating company.
   - The executive must be directly speaking and discussing company strategy, performance, operations, capital allocation, or forward-looking business plans.
   - If executive interview format is present, DO NOT classify as Company_analysis.
6. General_investment_guide:
   - Educational content (SIPs, Psychology, Portfolio construction,Investment guide) only.

7. Other:
   - Use if the post is purely news, earnings results without a thesis, or doesn't fit the above.

8. Multiple_company_update:
   - MUST be used for brief, factual, or "market-tape" notes on several stocks.
   - Includes lists of gainers/losers, price action, or news without a forward-looking thesis.

Your output must follow this strict JSON format:
{
  "classification": ""
  "sector": "", // Optional, only if classification is Sector_analysis
  "reasoning": "" // A concise explanation (1-2 sentences) of why you chose the classification
}

Return ONLY the JSON object. No explanations. No notes.

════════════════════════════════════════════════════════════════════════════
📄 BLOG CONTENT:
════════════════════════════════════════════════════════════════════════════
VERY IMPORTANT:
-If you think its company analysis, but the title indicates management interview, classify as management interview.
-If Multiple Sector are Discussed in the Blog text then Never classify as sector analysis even if the title indicates sector analysis.
-If the blog is not a core thesis about a company or sector and talk about finance such as mutual funds, asset allocation, investing psychology, portfolio construction then classify as general investment guide.

Blog Title : ${blogTitle}
Blog Text : ${blogText}
`;
export async function classifyVideo(
  blogText: string,
  blogTitle: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<ClassificationResult> {
  // Input validation
  if (!blogText || blogText.trim().length === 0) {
    throw new Error("Blog text cannot be empty");
  }

  // Default configuration
  const config = {
    model: options.model || "gpt-4o-mini",
    temperature: options.temperature ?? 0,
    maxTokens: options.maxTokens,
  };

  try {
    // Make API call
    const response = await client.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: createUserPrompt(blogText, blogTitle) },
      ],
    });

    // Extract and parse response
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("Empty response from OpenAI API");
    }

    const result: ClassificationResult = JSON.parse(content);

    // Validate response structure
    validateClassificationResult(result);

    return result;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse classification result: ${error.message}`);
    }
    throw error;
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function validateClassificationResult(result: ClassificationResult): void {
  const validClassifications: ClassificationType[] = [
    "Multiple_company_update",
    "Multiple_company_analysis",
    "Sector_analysis",
    "Company_analysis",
    "Macro_economic_analysis",
    "General_investment_guide",
    "Management_interview",
    "Other",
  ];

  // Validate classification
  if (!validClassifications.includes(result.classification)) {
    throw new Error(`Invalid classification: ${result.classification}`);
  }

}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  classifyVideo,
};