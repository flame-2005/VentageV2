// convex/functions/masterCompanyList.ts
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