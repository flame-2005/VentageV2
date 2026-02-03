"use node"

import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export interface CompanyExtraction {
  company: string;
  description: string;
}



export async function extractCompanies(
  classification: string,
  blogContent: string
): Promise<CompanyExtraction[]> {

  const isSectorAnalysis = classification === "Sector_analysis";
  
  const systemPrompt = `
You are an expert at extracting company names from Indian financial blog posts.

${isSectorAnalysis ? `
Your job is to identify ALL companies mentioned in the blog that belong to the sector being analyzed Remember to extract ALL companies very carefully.

════════════════════════════════════════════════════════════════════════════
🎯 EXTRACTION RULES FOR SECTOR ANALYSIS (CRITICAL)
════════════════════════════════════════════════════════════════════════════

1. Extract ALL companies mentioned that belong to the sector
   - Include companies that are the main subject
   - Include companies mentioned for comparison
   - Include companies mentioned as competitors
   - Include companies mentioned as examples within the sector
   - DO NOT ignore any company just because it's mentioned briefly

2. Extract COMPANY names, not brand names 
   - If "Blinkit" is mentioned → Extract "Zomato" (parent company)
   - If "Paytm" is mentioned → Extract "One97 Communications"
   - If "Jio" is mentioned → Extract "Reliance Industries"
   - If "Swiggy" is mentioned → Extract "Swiggy" (listed entity name)
   - If the company name itself contains "Brand" (like "BrandConcepts"), 
     that IS the company name - extract it as-is

3. ONLY include companies listed on NSE/BSE
   - Must be currently listed on NSE (National Stock Exchange of India) or BSE (Bombay Stock Exchange)
   - NO foreign-listed companies (NYSE, NASDAQ, LSE, etc.)
   - NO private companies, startups, or unicorns
   - NO unlisted subsidiaries
   - NO government bodies, ministries, educational institutions
   - NO investors or fund managers

4. IGNORE mentions from:
   - "Related Posts" sections
   - "Also Read" or "Recommended Articles"
   - Sidebars, headers, footers
   - Navigation menus
   - Tag clouds

5. For each extracted company, provide:
   - "company": Official NSE/BSE listed entity name
   - "description": 1-2 sentence summary of what role the company plays in the sector analysis
                   (e.g., "Market leader discussed in competitive analysis" or 
                    "Emerging player mentioned as growth opportunity in the sector")
` : `
Your job is to identify companies that are the MAIN SUBJECT of the blog's investment thesis.

════════════════════════════════════════════════════════════════════════════
🎯 EXTRACTION RULES (CRITICAL)
════════════════════════════════════════════════════════════════════════════

1. ONLY extract companies that are the TOPIC of the main thesis
   - If a company is mentioned in passing or as a comparison → IGNORE IT
   - Example: Blog about Titan mentions Sky Gold as a supplier → Extract ONLY "Titan"
   - Example: Blog about Reliance mentions Aramco as a partner → Extract ONLY "Reliance"

2. Extract COMPANY names, not brand names 
FOR EXAMPLE 
   - If "Blinkit" is mentioned → Extract "ETERNAL" (company)
   - If "Paytm" is mentioned → Extract "One97 Communications"
   - If "Jio" is mentioned → Extract "Reliance Industries"
   - If "Swiggy" is mentioned → Extract "Swiggy" (listed entity name)

3. ONLY include companies listed on NSE/BSE
   - Must be currently listed on NSE (National Stock Exchange of India) or BSE (Bombay Stock Exchange)
   - NO foreign-listed companies (NYSE, NASDAQ, LSE, etc.)
   - NO private companies, startups, or unicorns
   - NO unlisted subsidiaries
   - NO government bodies, ministries, educational institutions
   - NO investors or fund managers (e.g., Warren Buffett, Rakesh Jhunjhunwala)

4. IGNORE mentions from:
   - "Related Posts" sections
   - "Also Read" or "Recommended Articles"
   - Sidebars, headers, footers
   - Navigation menus
   - Tag clouds

5. For each extracted company, provide:
   - "company": Official NSE/BSE listed entity name
   - "description": 1-2 sentence summary of what role the company plays in the blog's thesis
                   (e.g., "Main subject analyzing margin expansion potential" or 
                    "Core holding discussed for long-term growth thesis")
`}

════════════════════════════════════════════════════════════════════════════
📋 OUTPUT FORMAT
════════════════════════════════════════════════════════════════════════════

Return ONLY a JSON array of objects:

[
  {
    "company": "Company Name",
    "description": "Brief description of the company's role in the ${isSectorAnalysis ? 'sector analysis' : 'blog thesis'}"
  }
]

If NO valid companies found, return: []

Do NOT include:
- Explanations
- Reasoning
- Extra text
${!isSectorAnalysis ? '- Companies mentioned only in passing' : ''}

════════════════════════════════════════════════════════════════════════════
`;

  const userPrompt = `
Classification: ${classification}

Extract companies from the blog content below.

Remember:
${isSectorAnalysis ? `
- Extract ALL companies mentioned that belong to the sector being analyzed
- Include companies mentioned for comparison, as competitors, or as examples
- Only exclude companies from unrelated sectors
` : `
- Only extract companies that are the MAIN TOPIC of the thesis
- Ignore companies mentioned in passing or as comparisons
`}
- Use company names (e.g., Zomato for Blinkit, One97 Communications for Paytm)
- Only NSE/BSE listed companies
- Ignore "Related Posts" or sidebar content

Blog Content:
"""
${blogContent}
"""

Return only the JSON array.
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      return [];
    }

    const result: CompanyExtraction[] = JSON.parse(content);
    return result;
  } catch (error) {
    console.error("Error extracting companies:", error);
    return [];
  }
}