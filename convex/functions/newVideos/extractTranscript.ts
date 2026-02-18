"use node"

import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY!
);

export async function analyzeYouTubeVideo(youtubeUrl: string) {
  try {
    console.log("🎥 Analyzing YouTube video...");
    console.log(`📎 URL: ${youtubeUrl}\n`);

    // Use gemini-1.5-flash (without -latest suffix)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // Detailed prompt for comprehensive video analysis
const systemPrompt = `
You are a world-class financial analyst and content writer specializing in equity research and investment analysis.

Your task: Transform the YouTube video at ${youtubeUrl} into a professional, standalone blog article.

CRITICAL RULES:
1. ONLY use information from the video - visit the URL and extract all content
2. NO hallucination - if a detail isn't in the video, don't include it
3. Write as a BLOG ARTICLE, not a video summary - never reference "the video," "the speaker," or "this presentation"
4. Present information as original research and analysis

BLOG CONTENT STRUCTURE:

**Introduction (2-3 paragraphs)**
- Hook the reader with the investment opportunity or key insight
- Present the core thesis upfront
- Set context without generic background

**Main Analysis (detailed sections)**
- Investment Thesis: What drives value? What's the competitive edge?
- Business Model & Economics: How does money flow? Unit economics, margins, profitability
- Market Opportunity: TAM, growth trends, market positioning
- Key Financials: Revenue segments, growth rates, specific numbers from the video
- Catalysts & Drivers: What could accelerate growth?
- Risks & Challenges: Headwinds, competition, vulnerabilities
- Valuation Perspective: Any multiples, comps, or valuation framework discussed

**Conclusion (1-2 paragraphs)**
- Synthesize the investment case
- Bottom-line perspective on the opportunity

WRITING STYLE:
- Professional, analytical, direct
- No fluff, no adjectives like "impressive" or "exciting"
- Fact-dense with specific numbers, percentages, timeframes
- Assume sophisticated investor audience
- Use subheadings to organize content
- 1500-3000 words optimal length

OUTPUT FORMAT (JSON):
{
  "videoContent": "complete blog article in professional format",
  "timeStamps": [
    {
      "time": "MM:SS",
      "topic": "Section topic",
      "description": "Brief description of what's covered"
    }
  ]
}

Remember: The reader should never know this came from a video. Write as if YOU conducted the research and analysis.
`;

    module.exports = { systemPrompt };

    // For YouTube videos, you need to pass them as file data
    const result = await model.generateContent([
      {
        fileData: {
          mimeType: "video/youtube",
          fileUri: youtubeUrl,
        },
      },
      { text: systemPrompt },
    ]);

    const response = await result.response;
    const summary = response.text();

    const cleanedText = summary.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("❌ Error analyzing video:", error);

    if (error instanceof Error) {
      console.error("\nError details:", error.message);

      if (error.message.includes("API key")) {
        console.error("\n⚠️  API Key issue - check your key is valid");
      } else if (
        error.message.includes("404") ||
        error.message.includes("not found")
      ) {
        console.error("\n⚠️  Model or feature not available");
        console.error(
          "   YouTube video analysis may require Google AI Studio access",
        );
        console.error("   Try using the YouTube Transcript API instead");
      }
    }

    throw error;
  }
}
