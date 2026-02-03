"use node"

import OpenAI from "openai";

// Types
export interface Company {
  nse?: string;
  bse?: string;
  name: string;
  marketCap:number
  extractedName: string; // Name as mentioned in the blog
}

interface ValidationResult {
  company: Company;
  isMatch: boolean;
  reason: string;
  confidence: "high" | "medium" | "low";
}

interface Agent4Input {
  blogContent: string;
  companies: Company[];
}

interface Agent4Output {
  validatedCompanies: ValidationResult[];
  matchedCompanies: Company[];
  rejectedCompanies: Company[];
  success: boolean;
  error?: string;
}

const MAX_RETRIES = 2;

/**
 * Main validation function with retry logic
 */
export async function validateCompanies(
  input: Agent4Input,
): Promise<Agent4Output> {
  const openai = new OpenAI({
    apiKey:process.env.OPENAI_API_KEY!
  });

  let attempt = 0;
  let lastError: string | undefined;

  while (attempt <= MAX_RETRIES) {
    try {
      console.log(`\n🔍 Validation Attempt ${attempt + 1}/${MAX_RETRIES + 1}`);

      const validationResults = await performValidation(
        openai,
        input.blogContent,
        input.companies,
      );

      const matchedCompanies = validationResults
        .filter((result) => result.isMatch)
        .map((result) => result.company);

      // Check if we have any matches
      if (matchedCompanies.length > 0) {
        console.log(`✅ Found ${matchedCompanies.length} matching companies`);
        return {
          validatedCompanies: validationResults,
          matchedCompanies,
          rejectedCompanies: validationResults
            .filter((result) => !result.isMatch)
            .map((result) => result.company),
          success: true,
        };
      }

      // No matches found, prepare for retry
      lastError = `No matching companies found in attempt ${attempt + 1}`;
      console.log(`⚠️ ${lastError}`);

      if (attempt < MAX_RETRIES) {
        console.log("🔄 Retrying validation...");
        attempt++;
      } else {
        break;
      }
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(`❌ Error in attempt ${attempt + 1}:`, lastError);

      if (attempt < MAX_RETRIES) {
        console.log("🔄 Retrying after error...");
        attempt++;
      } else {
        break;
      }
    }
  }

  // All retries exhausted without finding matches
  return sendShadabErrorAlert(
    lastError || "No companies matched after all retry attempts",
  );
}

/**
 * Perform the actual validation using ChatGPT
 */
async function performValidation(
  openai: OpenAI,
  blogContent: string,
  companies: Company[],
): Promise<ValidationResult[]> {
  const validationResults: ValidationResult[] = [];

  for (const company of companies) {
    const result = await validateSingleCompany(openai, blogContent, company);
    validationResults.push(result);
  }

  return validationResults;
}

/**
 * Validate a single company using ChatGPT
 */
async function validateSingleCompany(
  openai: OpenAI,
  blogContent: string,
  company: Company,
): Promise<ValidationResult> {
  const prompt = buildValidationPrompt(blogContent, company);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You're a world class analyst at a hedge fund with extensive knowledge of public markets. Your task is to validate whether companies mentioned in a blog match the correct publicly listed entities from a database.

          REMEMBER THAT IF A COMPANY OF A BRAND IS MENTIONED EVEN WHEN THE COMPANY IS NOT FULLY RELATED TO THE SECTOR STILL MUST BE INCLUDED IF THE BRAND BELONGS TO THAT SECTOR ex - ZOMATO AS COMPANY FOR QUICK COMMERS COMPANY BLINKIT

Your validation criteria:
1. SECTOR ALIGNMENT: The company's core business must match the blog's topic
2. NAME SIMILARITY: If the company name is similar but the sector is different, REJECT it
3. CONTEXTUAL CORRECTNESS: The company must be contextually correct with respect to the blog's subject matter

You must respond ONLY with valid JSON in this exact format:
{
  "isMatch": true/false,
  "reason": "detailed explanation of why this is or isn't a match",
  "confidence": "high/medium/low"
}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from ChatGPT");
    }

    const parsed = JSON.parse(content);

    return {
      company,
      isMatch: parsed.isMatch === true,
      reason: parsed.reason || "No reason provided",
      confidence: parsed.confidence || "low",
    };
  } catch (error) {
    console.error(`Error validating ${company.name}:`, error);

    // Return a rejection by default if validation fails
    return {
      company,
      isMatch: false,
      reason: `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      confidence: "low",
    };
  }
}

/**
 * Build the validation prompt for ChatGPT
 */
function buildValidationPrompt(blogContent: string, company: Company): string {
  return `
BLOG CONTENT:
${blogContent.substring(0, 10000)}${blogContent.length > 10000 ? "..." : ""}

---

COMPANY TO VALIDATE:
- Name as mentioned in blog: "${company.extractedName}"
- Database matched name: "${company.name}"
- NSE Symbol: ${company.nse || "N/A"}
- BSE Symbol: ${company.bse || "N/A"}

---

TASK:
Determine if the company "${company.name}" is the SAME company being discussed in the blog context where it was mentioned as "${company.extractedName}".

Consider:
1. Does the company's sector  align with the blog's topic?
2. Is the company name similar enough to be the same entity?
3. Is this company contextually correct given what the blog is discussing?

If the company name is similar but belongs to a DIFFERENT sector than what the blog is discussing, you MUST reject it.

Respond with valid JSON only.
`.trim();
}

/**
 * Send Shadab error alert when no companies match after all retries
 */
function sendShadabErrorAlert(errorMessage: string): Agent4Output {
  const alertMessage = `
╔════════════════════════════════════════════════════════╗
║                   🚨 SHADAB ALERT 🚨                   ║
╠════════════════════════════════════════════════════════╣
║  Agent 4 - Company Validator                           ║
║  Status: CRITICAL FAILURE                              ║
╠════════════════════════════════════════════════════════╣
║  Issue: No companies matched after ${MAX_RETRIES + 1} attempts         ║
║  Error: ${errorMessage.substring(0, 40).padEnd(40)}   ║
╠════════════════════════════════════════════════════════╣
║  Action Required:                                      ║
║  - Review blog content quality                         ║
║  - Check company extraction accuracy (Agent 2)         ║
║  - Verify vector DB matching logic (Agent 3)           ║
║  - Validate sector alignment criteria                  ║
╚════════════════════════════════════════════════════════╝
    `.trim();

  console.error(alertMessage);

  // You can also integrate with actual alerting systems here
  sendSlackAlert(alertMessage);
  sendEmailAlert(alertMessage);

  return {
    validatedCompanies: [],
    matchedCompanies: [],
    rejectedCompanies: [],
    success: false,
    error: errorMessage,
  };
}

/**
 * Send Slack alert (placeholder - implement with actual Slack webhook)
 */
function sendSlackAlert(message: string): void {
  // TODO: Implement Slack webhook integration
  console.log("📱 Slack alert would be sent:", message);
}

/**
 * Send email alert (placeholder - implement with actual email service)
 */
function sendEmailAlert(message: string): void {
  // TODO: Implement email service integration
  console.log("📧 Email alert would be sent:", message);
}

export function generateValidationReport(output: Agent4Output): string {
  if (!output.success) {
    return `Validation failed: ${output.error}`;
  }

  const report = `
Company Validation Report
========================

Total Companies Analyzed: ${output.validatedCompanies.length}
✅ Matched: ${output.matchedCompanies.length}
❌ Rejected: ${output.rejectedCompanies.length}

Matched Companies:
${output.matchedCompanies
  .map(
    (c, i) => `
  ${i + 1}. ${c.name}
     NSE: ${c.nse || "N/A"} | BSE: ${c.bse || "N/A"}
     Mentioned as: ${c.extractedName}
`,
  )
  .join("\n")}

Rejected Companies:
${output.rejectedCompanies
  .map((c, i) => {
    const validation = output.validatedCompanies.find((v) => v.company === c);
    return `
  ${i + 1}. ${c.name}
     Reason: ${validation?.reason || "Unknown"}
     Confidence: ${validation?.confidence || "N/A"}
`;
  })
  .join("\n")}
    `.trim();

  return report;
}
