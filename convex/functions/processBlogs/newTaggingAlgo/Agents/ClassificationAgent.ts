"use node"

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
  | "Other";

export interface ClassificationResult {
  classification: ClassificationType;
}

// ============================================================================
// OPENAI CLIENT CONFIGURATION
// ============================================================================

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
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
• Typically 1–3 short sentences per company (length alone does NOT imply analysis)
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

EACH company MUST have at least 2–3 meaningful sentences focused on 
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
A deep dive into one specific sector or industry.

PRIMARY DECISION RULE:
Classify as Sector_analysis if the core subject is a product category, 
therapeutic class, technology, or industry theme, and the article explains:
• Why it matters
• How it is evolving
• What structural forces will shape its future

CHARACTERISTICS:
• Explains structural trends, competitive dynamics, regulatory environment, growth levers
• Mentions companies only as examples supporting the sector narrative
• The sector is clearly the focus, not individual stocks
• No single company dominates the narrative

EVEN IF companies or drugs are mentioned, do NOT downgrade to Other 
as long as the article's thesis is about the sector/theme, not a stock.

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

────────────────────────────────────────────────────────────────────────────

6️⃣ OTHER
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

const createUserPrompt = (blogText: string): string => `
Read the blog content below and classify it into exactly ONE of the 6 predefined categories.

Your output must follow this strict JSON format:
{
  "classification": "",
}

Where:
- "classification" = one of:
    "Multiple_company_update",
    "Multiple_company_analysis",
    "Sector_analysis",
    "Company_analysis",
    "General_investment_guide",
    "Other"

Return ONLY the JSON object.
No explanations. No notes. No reasoning.

CRITICAL REMINDER:
• Company_analysis should strictly have only ONE company in the array
• If more than one company is present, it should be classified as Multiple_company_analysis
• This rule is MANDATORY

════════════════════════════════════════════════════════════════════════════
📄 BLOG CONTENT:
════════════════════════════════════════════════════════════════════════════

${blogText}

════════════════════════════════════════════════════════════════════════════
`;

// ============================================================================
// MAIN CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Classifies a financial blog post into one of six categories with detailed analysis
 * 
 * @param blogText - The complete blog post content to classify
 * @param options - Optional configuration for the OpenAI API call
 * @returns Classification result with company names, sector, tags, and summary
 * 
 * @example
 * ```typescript
 * const result = await classifyBlog(blogContent);
 * console.log(result.classification); // "Company_analysis"
 * console.log(result.company); // ["HDFC Bank"]
 * console.log(result.summary); // "HDFC Bank's thesis centers on..."
 * ```
 */
export async function classifyBlog(
  blogText: string,
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
        { role: "user", content: createUserPrompt(blogText) },
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
    "General_investment_guide",
    "Other",
  ];

  // Validate classification
  if (!validClassifications.includes(result.classification)) {
    throw new Error(`Invalid classification: ${result.classification}`);
  }

}

// ============================================================================
// BATCH PROCESSING UTILITY
// ============================================================================

export async function classifyBlogsBatch(
  blogs: string[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    delayMs?: number;
  }
): Promise<ClassificationResult[]> {
  const results: ClassificationResult[] = [];
  const delay = options?.delayMs || 0;

  for (let i = 0; i < blogs.length; i++) {
    const result = await classifyBlog(blogs[i], options);
    results.push(result);

    // Add delay between requests if specified
    if (delay > 0 && i < blogs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  classifyBlog,
  classifyBlogsBatch,
};