"use node"

import OpenAI from "openai";

const client = new OpenAI({
  apiKey:process.env.OPENAI_API_KEY!
});

export async function summarizeBlog(blogText: string) {
  const systemPrompt = `
You are Agent 1 — an expert financial blog classifier specializing in equity research, sector studies, and investment commentary.

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

      “The upside case rests on Y’s dominant distribution flywheel and the shift of Z-category spend online, where the firm already captures ~18% share and expands gross margin through private-label mix.”



      ALSO EXTRACT THE EXACT SENTIMENT OF THE BLOG 
      - All tags must be sentiment-style keywords such as:
        ["bullish", "bearish", "neutral"]

────────────────────────────────────────
END OF SYSTEM PROMPT
────────────────────────────────────────
`;

  const userPrompt = `
Read the blog content below and classify it into exactly ONE of the 5 predefined categories.

Your output must ONLY follow this strict JSON format :
{
  "tags": [],
  "summary":""
}


  - "tags" = sentiment-style tags such as:
    "bullish", "bearish", "neutral"

Return ONLY the JSON object.

📄 BLOG CONTENT:
"""
${blogText}
"""
────────────────────────────────────────
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const json = JSON.parse(response.choices[0].message.content!);
  return json;
}
