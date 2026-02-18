"use node"

import { fetchArticleContent } from "../../../helper/blogs";
import { classifyBlog } from "./Agents/ClassificationAgent";
import { extractCompanies } from "./Agents/extractCompanies";
import { resolveCompanyNames } from "./Agents/VectorDBMatcher";
import { Company, validateCompanies } from "./Agents/varifyCompanies";

export async function main() {
  const blogContent = await fetchArticleContent(
    "https://zennivesh.substack.com/p/brand-concepts-a-deep-dive"
  );

  const Agent1Responce = await classifyBlog(blogContent!);

  const Agent2Response = await extractCompanies(
    Agent1Responce.classification,
    blogContent!,
  );

  console.log("agent 2 response :",Agent2Response)

  const companies = Agent2Response.map((res) => res.company.toUpperCase());

  const Agent3Response = await resolveCompanyNames(companies);

  const matchedCompanies: Company[] = Agent3Response.filter(
    (res) => res.status === "found" || res.status === "ambiguous",
  ).map((res) => ({
    name: res.matchedName ?? res.inputName, // resolved name if found
    extractedName: res.inputName, // name as mentioned in blog
    nse: res.nseCode,
    bse: res.bseCode,
    marketCap:res.marketCap!
  }));

  console.log("matched companies :",matchedCompanies)

  const Agent4Responce = await validateCompanies({
    blogContent: blogContent!,
    companies: matchedCompanies,
  });

  console.log(Agent4Responce);
}

main();
