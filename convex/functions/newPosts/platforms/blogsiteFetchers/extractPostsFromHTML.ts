"use node"

import OpenAI from "openai";
import { IncomingPost as BlogPost } from "../../../../constant/posts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractPostsFromHTML_AI(
  html: string,
  url: string
): Promise<BlogPost[]> {
const prompt = `
You are an expert blog content extractor.

Your task is to extract ALL blog posts found in the provided HTML. 
A "blog post" means any article, news item, commentary, or content entry that normally appears in a blog feed.

-----------------------------------
WHAT TO EXTRACT FOR EACH BLOG POST
-----------------------------------
For every blog post you detect, extract:

1. "title"      → The blog post's headline.
2. "link"       → The full URL to the post (absolute URL only).
3. "published"  → The published date (ISO or readable format).
4. "author"     → The author's name (null if not found).
5. "image"      → The main featured image of the post (null if missing).

-----------------------------------
HOW TO DETECT A BLOG POST IN HTML
-----------------------------------
Look for ANY of these patterns:

✔ <article> elements  
✔ <h1>, <h2>, <h3> inside article/post containers  
✔ Post wrappers such as:
   - div.post
   - div.blog-post
   - li.article
   - section.post-card
   - div.entry
   - div.card (if containing date & title)
✔ CMS signatures:
   - WordPress: "entry-content", "wp-block", "post-thumbnail"
   - Ghost: "post-card", "post-card-image"
   - Substack: "post-preview-content"
   - Medium: "postArticle", "graf", "section-content"
✔ Date patterns:
   - <time datetime="...">
   - Strings like: "2024", "2023", "Jan", "March", "Published on"
✔ Author patterns:
   - "By John"
   - <span class="author">
✔ Featured image:
   - <img> inside article header
   - OpenGraph tags (og:image) if the post has none

-----------------------------------
SPECIAL RULES
-----------------------------------
- If a URL is relative (e.g., "/blog/post-1"), CONVERT it to an absolute URL using base: ${url}
- Ignore navigation menus, tags, category lists, product pages, and marketing sections.
- Only include actual blog post entries.
- If published date is missing, set: "published": ""
- If author is missing, set: "author": null
- If image is missing, set: "image": null

-----------------------------------
STRICT OUTPUT FORMAT (VERY IMPORTANT)
-----------------------------------
Return ONLY valid JSON.
NO text or explanation outside JSON.
Format MUST be:

[
  {
    "title": "string",
    "link": "string",
    "published": "string",
    "author": "string | null",
    "image": "string | null",
    "source": "others"
  }
]

-----------------------------------
HTML CONTENT TO ANALYZE (TRUNCATED)
-----------------------------------
${html.substring(0, 15000)}
`;


  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const content = resp.choices[0].message?.content ?? "[]";

  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
}
