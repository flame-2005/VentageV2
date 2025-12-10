import { Doc, Id } from "../_generated/dataModel";
import { action, mutation } from "../_generated/server";
import { CompanyDetail, RSSItem, ValidClassification } from "../constant/posts";
import { api } from "../_generated/api";

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
  if (extractedCompanies === null) {
    return {
      company_name: null,
      bse_code: null,
      nse_code: null,
      market_cap: null,
    };
  }
  const companyNames = extractedCompanies
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  console.log(companyNames);
  const matchedCompanies: Array<{
    name: string;
    bse_code: string | null;
    nse_code: string | null;
    market_cap: number | null;
  }> = [];

  companyNames.forEach((companyName) => {
    const match = masterCompanyList.find((masterCompany) => {
      const masterName = masterCompany.company_name?.toLowerCase() || "";
      const nseCode = masterCompany.nse_code?.toLowerCase() || "";

      // 1️⃣ If extracted string matches NSE code → return this company immediately
      if (companyName === nseCode) return true;

      // 2️⃣ Exact company name match
      if (masterName === companyName) return true;

      // 3️⃣ Prefix checks (dangerous for short names but keeping as per your logic)
      if (masterName.startsWith(companyName)) return true;
      if (companyName.startsWith(masterName)) return true;

      // 4️⃣ Word-by-word match
      if (masterName.split(" ").includes(companyName)) return true;
      if (companyName.split(" ").includes(masterName)) return true;

      // 5️⃣ First two words match
      const masterTwo = masterName.split(" ").slice(0, 2).join(" ");
      const companyTwo = companyName.split(" ").slice(0, 2).join(" ");
      if (masterTwo === companyTwo) return true;

      return false;
    });

    if (match && match.market_cap !== null && match.market_cap >= 30000000) {
      // Matched → return matched company
      matchedCompanies.push({
        name: match.company_name,
        bse_code: match.bse_code || null,
        nse_code: match.nse_code || null,
        market_cap: match.market_cap || null,
      });

      console.log(`✅ Matched: "${companyName}" → ${match.company_name}`);
    }
  });

  return {
    company_name: matchedCompanies.map((c) => c.name).join(", "),
    bse_code:
      matchedCompanies
        .map((c) => c.bse_code || "")
        .filter(Boolean)
        .join(", ") || null,
    nse_code:
      matchedCompanies
        .map((c) => c.nse_code || "")
        .filter(Boolean)
        .join(", ") || null,
    market_cap:
      matchedCompanies
        .map((c) => (c.market_cap !== null ? c.market_cap.toString() : ""))
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
  // check enum match safely
  const validValues = Object.values(ValidClassification);
  if (!validValues.includes(post.classification as ValidClassification)) {
    return false;
  }

  const { bseCode, nseCode, companyDetails } = post;

  const hasBse = typeof bseCode === "string" && bseCode.trim().length > 0;

  const hasNse = typeof nseCode === "string" && nseCode.trim().length > 0;

  const hasCompanyDetails =
    Array.isArray(companyDetails) && companyDetails.length > 0;

  return hasBse || hasNse || hasCompanyDetails;
}

export function normalizeUrl(url: string): string {
  // Ensure protocol
  let normalized = url.startsWith("http://") || url.startsWith("https://")
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

