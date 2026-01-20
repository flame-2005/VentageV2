import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { generateSearchTokens } from "../helper/masterCompanies";

// Mutation to replace all companies (delete old, insert new)
export const replaceAllCompanies = mutation({
  args: {
    companies: v.array(
      v.object({
        bse_code: v.union(v.string(), v.null()),
        nse_code: v.string(),
        name: v.string(),
        instrument_token: v.number(),
        isin: v.union(v.string(), v.null()),
        exchange: v.string(),
        record_hash: v.string(),
        created_at: v.string(),
        updated_at: v.string(),
        market_cap: v.union(v.number(), v.null()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // 1️⃣ Normalize incoming data
    const incoming = args.companies.map((c) => ({
      ...c,
      name: c.name.trim().toUpperCase(),
    }));

    // 2️⃣ Load existing companies once
    const existingCompanies = await ctx.db
      .query("master_company_list")
      .collect();

    const existingMap = new Map(existingCompanies.map((c) => [c.name, c]));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const company of incoming) {
      const existing = existingMap.get(company.name);
      const search_tokens = generateSearchTokens(company.name);

      // 🆕 Insert
      if (!existing) {
        await ctx.db.insert("master_company_list", {
          bse_code: company.bse_code ?? undefined,
          nse_code: company.nse_code,
          name: company.name,
          instrument_token: company.instrument_token,
          isin: company.isin ?? undefined,
          exchange: company.exchange,
          record_hash: company.record_hash,
          created_at: company.created_at,
          updated_at: company.updated_at,
          checked_market_cap: false,
          market_cap: company.market_cap ?? undefined,
          search_tokens,
        });
        inserted++;
        continue;
      }

      // 🔍 Detect changes (IMPORTANT)
      const hasChanges =
        existing.record_hash !== company.record_hash ||
        existing.nse_code !== company.nse_code ||
        (existing.bse_code ?? null) !== company.bse_code ||
        existing.instrument_token !== company.instrument_token ||
        existing.exchange !== company.exchange;

      if (!hasChanges) {
        skipped++;
        continue;
      }

      // 🔁 Patch changed fields
      await ctx.db.patch(existing._id, {
        bse_code: company.bse_code ?? undefined,
        nse_code: company.nse_code,
        instrument_token: company.instrument_token,
        exchange: company.exchange,
        checked_market_cap: false,
        record_hash: company.record_hash,
        updated_at: company.updated_at,
      });

      updated++;
    }

    return {
      totalIncoming: incoming.length,
      inserted,
      updated,
      skipped,
      existing: existingCompanies.length,
    };
  },
});

// Query to get all companies
export const getAllCompanies = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("master_company_list").collect();
  },
});

// Query to get company by NSE code
export const getCompanyByNseCode = query({
  args: { nse_code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("master_company_list")
      .withIndex("nse_code", (q) => q.eq("nse_code", args.nse_code))
      .first();
  },
});

// Query to search companies by name
export const searchCompaniesByName = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const allCompanies = await ctx.db.query("master_company_list").collect();

    return allCompanies.filter((company) =>
      company.name.toLowerCase().includes(args.searchTerm.toLowerCase()),
    );
  },
});

// Query to get total count
export const getCompanyCount = query({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("master_company_list").collect();
    return companies.length;
  },
});

// Query to get companies that need enrichment
export const getCompaniesNeedingMarketCap = query({
  args: {
    cursor: v.optional(v.number()),
    limit: v.number(),
  },
handler: async (ctx, { cursor, limit }) => {
  let q = ctx.db
    .query("master_company_list")
    .filter((q) =>
      q.and(
        q.eq(q.field("checked_market_cap"), false),
      )
    )
    .order("asc"); // _creationTime

  if (cursor !== undefined) {
    q = q.filter((q) =>
      q.gt(q.field("_creationTime"), cursor)
    );
  }

  return await q.take(limit);
}

});

// Mutation to update company enrichment data
export const updateCompanyEnrichment = mutation({
  args: {
    id: v.id("master_company_list"),
    market_cap: v.union(v.number(), v.null()),
    checked_market_cap: v.union(v.boolean(), v.null()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      market_cap: args.market_cap ?? undefined,
      updated_at: new Date().toISOString(),
      checked_market_cap: args.checked_market_cap ?? undefined,
    });
    return { success: true };
  },
});

export const bulkUpdateCompanyEnrichment = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("master_company_list"),
        market_cap: v.union(v.number(), v.null()),
        checked_market_cap: v.union(v.boolean(), v.null()),
      }),
    ),
  },

  handler: async (ctx, { updates }) => {
    for (const item of updates) {
      await ctx.db.patch(item.id, {
        market_cap: item.market_cap ?? undefined,
        checked_market_cap: item.checked_market_cap ?? undefined,
        updated_at: new Date().toISOString(),
      });
    }

    return { success: true, updated: updates.length };
  },
});

export const bulkUpdateSearchTokens = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("master_company_list"),
        search_tokens: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, { updates }) => {
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        await ctx.db.patch(update.id, {
          search_tokens: update.search_tokens,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to update company ${update.id}:`, error);
        errorCount++;
      }
    }

    return {
      success: successCount,
      errors: errorCount,
      total: updates.length,
    };
  },
});

export const bulkUpdateCompanies = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("master_company_list"),
        fields: v.object({
          bse_code: v.optional(v.string()),
          nse_code: v.optional(v.string()),
          name: v.optional(v.string()),
          instrument_token: v.optional(v.number()),
          isin: v.optional(v.string()),
          exchange: v.optional(v.string()),
          market_cap: v.optional(v.number()),
          record_hash: v.optional(v.string()),
          checked_market_cap: v.optional(v.boolean()),
          updated_at: v.optional(v.string()),
          search_tokens: v.optional(v.array(v.string())),
        }),
      }),
    ),
  },
  handler: async (ctx, { updates }) => {
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const update of updates) {
      try {
        const fieldsToUpdate = Object.fromEntries(
          Object.entries(update.fields).filter(
            ([_, value]) => value !== undefined,
          ),
        );

        fieldsToUpdate.updated_at = new Date().toISOString();

        await ctx.db.patch(update.id, fieldsToUpdate);
        successCount++;
      } catch (error) {
        console.error(`Failed to update company ${update.id}:`, error);
        errorCount++;
        errors.push({
          id: update.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: successCount,
      errors: errorCount,
      total: updates.length,
      failedUpdates: errors,
    };
  },
});

export const companiesWithoutMarketCap = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("master_company_list")
      .filter((q) =>
        q.or(
          q.eq(q.field("market_cap"), null),
          q.eq(q.field("market_cap"), undefined),
        ),
      )
      .collect();
  },
});
