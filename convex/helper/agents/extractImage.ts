import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const SYSTEM_PROMPT = `
You are an expert at analyzing raw HTML and identifying the single most representative image associated with a webpage or article.

Follow these selection rules in this exact order:

1. FIRST PRIORITY:
   - <meta property="og:image"> or <meta name="og:image">
   - <meta property="og:image:url">
   - <meta property="twitter:image">
   These are the canonical preview images and should be chosen when present.

2. SECOND PRIORITY:
   - <link rel="image_src">
   - <meta property="image"> or <meta itemprop="image">

3. THIRD PRIORITY:
   - Large <img> elements that appear to represent page content
   - Article hero images, banners, or thumbnails

4. AVOID:
   - Favicons
   - Logos unless no better image exists
   - Small icons, avatars, decorative images, or tracking pixels
   - Base64 data images
   - CSS background images

STRICT OUTPUT REQUIREMENTS:
- Return ONLY a single absolute image URL starting with http or https.
- Do NOT return explanations.
- Do NOT return markdown or JSON.
- If no valid image is found, return an empty string.
`;

// Clean helper to enforce absolute URLs
function toAbsoluteUrl(imageUrl: string, baseUrl: string): string | null {
  try {
    // Already absolute
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }
    // Convert relative → absolute
    return new URL(imageUrl, baseUrl).href;
  } catch {
    return null;
  }
}

export async function aiExtractImage(
  html: string,
  baseUrl: string
): Promise<string | null> {
  try {
    // Truncate HTML to prevent token explosion (100k chars is safe enough)
    const truncatedHtml = html.length > 100_000 ? html.slice(0, 100_000) : html;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract the primary image from this HTML:\n\n${truncatedHtml}`,
        },
      ],
      max_tokens: 200,
      temperature: 0,
    });

    const raw = completion.choices[0].message.content?.trim() || "";

    if (!raw) return null;

    const absolute = toAbsoluteUrl(raw, baseUrl);

    return absolute && absolute.startsWith("http") ? absolute : null;
  } catch (err) {
    console.log("AI extraction failed:", err);
    return null;
  }
}
