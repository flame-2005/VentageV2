
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

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
      })
    ),
  },
  handler: async (ctx, args) => {
    // Step 1: Delete all existing records
    const existingCompanies = await ctx.db.query("master_company_list").collect();
    
    for (const company of existingCompanies) {
      await ctx.db.delete(company._id);
    }

    console.log(`Deleted ${existingCompanies.length} existing records`);

    // Step 2: Insert new records in batches
    let inserted = 0;
    for (const company of args.companies) {
      // Convert null to undefined for optional fields
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
      });
      inserted++;
    }

    console.log(`Inserted ${inserted} new records`);
    
    return {
      deleted: existingCompanies.length,
      inserted: inserted,
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
      company.name.toLowerCase().includes(args.searchTerm.toLowerCase())
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