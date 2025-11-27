// convex/functions/masterCompanyList.ts
import { v } from "convex/values";
import { query } from "../_generated/server";

// Get all companies from master_company_list
export const getAllCompanies = query({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db
      .query("master_company_list")
      .collect();
    
    return companies.map(company => ({
      _id: company._id,
      company_name: company.name,
      nse_code: company.nse_code || null,
      bse_code: company.bse_code || null,
    }));
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const normalizedName = name.toLowerCase().trim();
    return await ctx.db
      .query("master_company_list")
      .withIndex("name", (q) => q.eq("name", normalizedName))
      .collect();
  },
});