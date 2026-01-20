// convex/migrations/addSearchTokens.ts
import { internalMutation, mutation, query } from "../_generated/server";
import { v } from "convex/values";

const INVALID_TOKEN_SUFFIXES = new Set([
  "MRO",
  "INDIA",
  "RE2",
  "RE",
  "RR",
  "IV",
  "IT",
  "GS",
  "E1",
  "P1",
  "W1",
  "TB",
  "SZ",
]);

const INVALID_NAME_KEYWORDS = [
  "FUND",
  "BOND",
  "BONDS",
  "DEBENTURE",
  "GILT",
  "SECURITY",
  "NIFTY",
  "BSE",
  "ETF",
  "INDEX",
  "SCHEME",
  "TRUST",
  "NIFTY50",
  "NIFTY100",
  "NIFTY200",
  "NIFTY500",
];

export const migrateBatch = mutation({
  args: {
    cursor: v.optional(v.id("master_company_list")),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, batchSize = 100 }) => {
    let query = ctx.db.query("master_company_list").order("asc");

    if (cursor) {
      query = query.filter((q) => q.gt(q.field("_id"), cursor));
    }

    const companies = await query.take(batchSize);

    // Check total count (only on first batch)
    if (!cursor) {
      const total = await ctx.db.query("master_company_list").collect();
      console.log(`Total companies in DB: ${total.length}`);
    }

    for (const company of companies) {
      const tokens = company.name
        .toUpperCase()
        .split(/\s+/)
        .filter((token) => token.length > 0);

      await ctx.db.patch(company._id, {
        search_tokens: tokens,
      });
    }

    const nextCursor =
      companies.length > 0 ? companies[companies.length - 1]._id : null;

    return {
      processed: companies.length,
      nextCursor,
      done: companies.length < batchSize,
    };
  },
});

// Simple one-shot migration for smaller datasets
export const populateAllSearchTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("master_company_list").collect();

    let updated = 0;

    for (const company of companies) {
      const tokens = company.name
        .toUpperCase()
        .split(/\s+/)
        .filter((token) => token.length > 0);

      await ctx.db.patch(company._id, {
        search_tokens: tokens,
      });

      updated++;
    }

    console.log(`Migration complete! Updated ${updated} companies.`);
    return { updated };
  },
});

export function generateSearchTokens(name: string): string[] {
  return name
    .toUpperCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

export const getCompaniesWithoutBseCode = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 6000;

    // Fetch companies where bse_code is null/undefined but nse symbol exists
    const companies = await ctx.db
      .query("master_company_list")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("bse_code"), null),
            q.eq(q.field("bse_code"), undefined),
            q.eq(q.field("bse_code"), ""),
          ),
          q.neq(q.field("nse_code"), null),
          q.neq(q.field("nse_code"), undefined),
          q.neq(q.field("nse_code"), ""),
        ),
      )
      .take(limit);

    return companies.map((company) => ({
      _id: company._id,
      name: company.name,
      nse_symbol: company.nse_code,
      bse_code: company.bse_code,
    }));
  },
});

export const downloadCompaniesMissingMarketCap = query({
  args: {
    cursor: v.string(),
    limit: v.optional(v.number()),
  },

  handler: async (ctx) => {
    const page = await ctx.db
      .query("master_company_list")
      .withIndex("marketCap", (q) => q.eq("market_cap", undefined))
      .collect();

    return page;
  },
});

export const bulkCheckCompaniesByName = query({
  args: {
    names: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Normalize input → ALL CAPS + trim + dedupe
    const normalizedNames = [
      ...new Set(args.names.map((name) => name.trim().toUpperCase())),
    ];

    // Query DB
    const existingCompanies = await Promise.all(
      normalizedNames.map((name) =>
        ctx.db
          .query("master_company_list")
          .withIndex("name", (q) => q.eq("name", name))
          .first(),
      ),
    );

    const existingSet = new Set(
      existingCompanies.filter(Boolean).map((company) => company!.name),
    );

    return normalizedNames.map((name) => ({
      name,
      exists: existingSet.has(name),
    }));
  },
});
export function hasInvalidToken(exchangeToken?: string): boolean {
  if (!exchangeToken) return false;

  //  ❌ starts with a number
   if (/^\d/.test(exchangeToken)) {
     return true;
   }

  // ❌ contains invalid suffix after "-"
  const parts = exchangeToken.split("-");
  if (parts.length > 1) {
    const suffix = parts[parts.length - 1];
    if (INVALID_TOKEN_SUFFIXES.has(suffix)) {
      return true;
    }
  }

  return false;
}


export function isInvalidGS(name: string, symbol: string): boolean {
  return (
    (name.startsWith("GS") || symbol.startsWith("GS")) && /\d/.test(symbol)
  );
}

export function hasInvalidNameKeywords(name: string): boolean {
  const upper = name.toUpperCase();
  return INVALID_NAME_KEYWORDS.some((kw) => upper.includes(kw));
}
