import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

export interface ExtractCompanyInput {
  title: string;
  link: string;
  masterCompanyList: Array<{
    company_name: string;
    nse_code: string | null;
    bse_code: string | null;
  }>;
}

export interface ExtractCompanyOutput {
  success: boolean;
  data: {
    title: string;
    summary: string;
    company_name: string | null; // Comma-separated if multiple
    bse_code: string | null; // Comma-separated if multiple
    nse_code: string | null; // Comma-separated if multiple
    category: string;
    image_url: string | null;
  };
  error?: string;
}

// Helper function to fetch article content
async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogAnalyzer/1.0)',
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
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Limit to first ~10000 chars to avoid token limits
    return textContent.slice(0, 10000);
  } catch (error) {
    console.error(`❌ Error fetching article:`, error);
    return null;
  }
}

export async function extractCompanyData({
  title,
  link,
  masterCompanyList,
}: ExtractCompanyInput): Promise<ExtractCompanyOutput> {
  
  console.log(`🔍 Fetching content from: ${link}`);
  
  // FETCH THE ACTUAL ARTICLE CONTENT
  const articleContent = await fetchArticleContent(link);
  
  if (!articleContent) {
    console.error(`❌ Could not fetch content for ${link}`);
    return {
      success: false,
      error: "Failed to fetch article content",
      data: {
        title,
        summary: `Unable to analyze: ${title}`,
        company_name: null,
        bse_code: null,
        nse_code: null,
        category: "Uncategorized",
        image_url: null,
      },
    };
  }

  // Create a formatted list of companies for the AI
  const companyListFormatted = masterCompanyList
    .map(c => `${c.company_name} (NSE: ${c.nse_code || 'N/A'}, BSE: ${c.bse_code || 'N/A'})`)
    .join('\n');

  const prompt = `
You are a world-class fundamental equity analyst summarizing an investment-thesis blog post.

CRITICAL: You must ONLY use company names from the Master Company List provided below. Do not make up or hallucinate company names.

MASTER COMPANY LIST (use EXACT names from here):
${companyListFormatted}

Your task:
1. Read the article content provided below
2. Produce a 1–2 line, punchy, high-signal summary (max 40 words) that includes:
   - The core investment thesis (what drives the business, why it can win)
   - Key supporting facts (numbers, growth rates, margins, TAM, catalysts)

Rules:
- No fluff, no adjectives, no generic praise
- Focus only on core value drivers
- Include hard facts or data points when available
- Thesis-first, analytical tone
- If the article discusses multiple companies from the Master List, mention all of them

3. Identify companies:
   - ONLY use company names that EXACTLY match the Master Company List above
   - If multiple companies are discussed, list ALL of them separated by commas
   - Get the NSE and BSE codes from the Master List for identified companies
   - If article is about an industry/sector without specific companies, set company_name to null

4. Identify the category/industry (e.g., "Banking", "Automobiles", "Technology", "Pharma", etc.)

Return ONLY valid JSON in this exact format:
{
  "title": "Title of the blog post",
  "summary": "Punchy investment thesis summary (max 40 words)",
  "company_name": "Exact company name from Master List (or comma-separated names, or null)",
  "bse_code": "BSE code from Master List (comma-separated if multiple, or null)",
  "nse_code": "NSE code from Master List (comma-separated if multiple, or null)",
  "category": "Industry/sector",
  "image_url": "Featured image URL if found in HTML, or null"
}

Article Title: ${title}

Article Content:
${articleContent}
`.trim();

  try {
    console.log(`🤖 Sending to OpenAI...`);
    
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2, // Lower temperature for more accurate matching
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

    console.log(`✅ Extracted data:`, {
      company: parsed.company_name,
      category: parsed.category,
      summaryLength: parsed.summary?.length || 0,
    });

    return { success: true, data: parsed };
    
  } catch (error) {
    console.error("❌ OpenAI API Error:", error);
    return {
      success: false,
      error: String(error),
      data: {
        title,
        summary: `Investment thesis: ${title}`,
        company_name: null,
        bse_code: null,
        nse_code: null,
        category: "Uncategorized",
        image_url: null,
      },
    };
  }
}