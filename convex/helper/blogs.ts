import { Doc, Id } from "../_generated/dataModel";
import { action, mutation, query } from "../_generated/server";
import { CompanyDetail, RSSItem, ValidClassification } from "../constant/posts";
import { api } from "../_generated/api";
import { v } from "convex/values";

export async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://medium.com/",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Site": "same-site",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract text content from HTML
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

    // Limit to first ~10000 chars to avoid token limits
    return textContent.slice(0, 10000);
  } catch (error) {
    console.error(`❌ Error fetching article:`, error);
    return null;
  }
}

export function matchCompaniesWithMasterList(
  extractedCompanies: string | null,
  masterCompanyList: Array<{
    company_name: string;
    bse_code: string | null;
    nse_code: string | null;
    market_cap: number | null;
  }>
) {
  if (!extractedCompanies) {
    return {
      company_name: null,
      bse_code: null,
      nse_code: null,
      market_cap: null,
    };
  }

  function normalizeName(name: string) {
    return (
      name
        .toLowerCase()

        // 🔑 Handle possessives FIRST
        .replace(/(\w+)'s\b/g, "$1s") // reddy's → reddys
        .replace(/(\w+)\s+s\b/g, "$1s") // reddy s → reddys

        // Remove common suffixes
        .replace(/\b(ltd|limited|pvt|private|co|company|corp|inc)\b/g, "")

        // Remove punctuation
        .replace(/[^a-z0-9 ]/g, " ")

        // Collapse spaces
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  function tokenSet(name: string) {
    return new Set(name.split(" "));
  }

  function tokenOverlap(a: string, b: string) {
    const A = tokenSet(a);
    const B = tokenSet(b);
    let common = 0;
    A.forEach((t) => {
      if (B.has(t)) common++;
    });
    return common / Math.min(A.size, B.size);
  }

  function isValidStructuralMatch(extracted: string, master: string) {
    const extractedTokens = extracted.split(" ");
    const masterTokens = master.split(" ");

    // 🚫 Single-token extracted name cannot match multi-token master name
    if (extractedTokens.length === 1 && masterTokens.length > 1) {
      return false;
    }

    return true;
  }

  const companyNames = extractedCompanies
    .split(",")
    .map((c) => normalizeName(c))
    .filter(Boolean);

  const matchedCompanies: Array<{
    name: string;
    bse_code: string | null;
    nse_code: string | null;
    market_cap: number | null;
  }> = [];

  for (const companyName of companyNames) {
    let bestMatch;
    let bestScore = 0;

    for (const master of masterCompanyList) {
      const masterName = normalizeName(master.company_name);
      const nseCode = master.nse_code?.toLowerCase() || "";

      // 1️⃣ Exact NSE code match (STRONGEST SIGNAL)
      if (companyName === nseCode) {
        bestMatch = master;
        bestScore = 1;
        break;
      }

      // 2️⃣ Exact normalized name match
      if (
        companyName === masterName &&
        isValidStructuralMatch(companyName, masterName)
      ) {
        console.log("masterName");
        bestMatch = master;
        bestScore = 1;
        break;
      }

      // 3️⃣ High token overlap (≥70%)
      const overlap = tokenOverlap(companyName, masterName);
      if (overlap >= 0.7 && overlap > bestScore) {
        console.log("overlap");
        bestMatch = master;
        bestScore = overlap;
      }
    }

    // 4️⃣ Final acceptance rule
    if (
      bestMatch &&
      bestMatch.market_cap !== null &&
      bestMatch.market_cap >= 30_000_000
    ) {
      matchedCompanies.push({
        name: bestMatch.company_name,
        bse_code: bestMatch.bse_code,
        nse_code: bestMatch.nse_code,
        market_cap: bestMatch.market_cap,
      });

      console.log(`✅ Matched: "${companyName}" → ${bestMatch.company_name}`);
    }
  }

  return {
    company_name: matchedCompanies.map((c) => c.name).join(", ") || null,
    bse_code:
      matchedCompanies
        .map((c) => c.bse_code)
        .filter(Boolean)
        .join(", ") || null,
    nse_code:
      matchedCompanies
        .map((c) => c.nse_code)
        .filter(Boolean)
        .join(", ") || null,
    market_cap:
      matchedCompanies
        .map((c) => c.market_cap?.toString())
        .filter(Boolean)
        .join(", ") || null,
  };
}

export function parseMultiMatch(matched: {
  company_name?: string | null;
  bse_code?: string | null;
  nse_code?: string | null;
  market_cap?: string | null;
}): CompanyDetail[] {
  if (!matched.company_name) return [];

  const names = matched.company_name.split(",").map((s) => s.trim());
  const bse = matched.bse_code?.split(",").map((s) => s.trim()) ?? [];
  const nse = matched.nse_code?.split(",").map((s) => s.trim()) ?? [];
  const mcaps =
    matched.market_cap?.split(",").map((s) => Number(s.trim())) ?? [];

  return names.map((name, i) => ({
    company_name: name,
    bse_code: bse[i] || undefined,
    nse_code: nse[i] || undefined,
    market_cap: mcaps[i] || undefined,
  }));
}

export function hasCompanyData(post: Doc<"posts">): boolean {
  // ❌ filter out all eduinvesting.in blogs
  if (
    typeof post.link === "string" &&
    post.link.toLowerCase().includes("eduinvesting.in")
  ) {
    return false;
  }

  // check enum match safely
  const validValues = Object.values(ValidClassification);
  if (!validValues.includes(post.classification as ValidClassification)) {
    return false;
  }

  const { nseCode, companyDetails, author } = post;

  const isEduInvestingAuthor =
    author === "Eduinvesting Team" || author === "Viceroy Research";

  const hasNse =
    typeof nseCode === "string" &&
    nseCode.trim().length > 0 &&
    !isEduInvestingAuthor;

  const hasCompanyDetails =
    Array.isArray(companyDetails) &&
    companyDetails.length > 0 &&
    !isEduInvestingAuthor;

  return hasCompanyDetails || hasNse;
}

export function normalizeUrl(url: string): string {
  // Ensure protocol
  let normalized =
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;

  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, "");

  // Remove any feed-like suffix
  normalized = normalized.replace(
    /\/(feed|rss|rss\.xml|index\.xml|atom\.xml)$/i,
    ""
  );

  return normalized;
}

export const getBlog = query({
  args: {
    blogId: v.id("blogs"),
  },
  handler: async (ctx, { blogId }) => {
    const blog = await ctx.db.get(blogId);

    if (!blog) {
      throw new Error(`Blog with ID ${blogId} not found`);
    }

    return blog;
  },
});

export const assignBlogIdsToPosts = mutation({
  handler: async (ctx) => {
    const blogs = await ctx.db.query("blogs").collect();
    const posts = await ctx.db.query("posts").collect();

    let updatedCount = 0;

    // Function to normalize URLs
    const normalize = (url: string) =>
      url.replace(/^https?:\/\//, "").replace(/\/$/, "");

    for (const post of posts) {
      if (post.blogId) continue;
      if (!post.link) continue;

      const postNorm = normalize(post.link);

      const matchedBlog = blogs.find((blog) => {
        if (!blog.feedUrl) return false;

        // Remove /feed or /rss etc.
        const base = blog.feedUrl.replace(/\/feed$|\/rss$|\/atom$/, "");
        const baseNorm = normalize(base);

        return postNorm.startsWith(baseNorm);
      });

      if (matchedBlog) {
        await ctx.db.patch(post._id, { blogId: matchedBlog._id });
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  },
});
