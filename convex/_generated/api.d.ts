/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _client from "../_client.js";
import type * as constant_posts from "../constant/posts.js";
import type * as crons from "../crons.js";
import type * as functions_cleanUp from "../functions/cleanUp.js";
import type * as functions_masterCompanies from "../functions/masterCompanies.js";
import type * as functions_masterCompany from "../functions/masterCompany.js";
import type * as functions_masterCompanyList from "../functions/masterCompanyList.js";
import type * as functions_newPosts_checkNewPosts from "../functions/newPosts/checkNewPosts.js";
import type * as functions_newPosts_platforms_blogstopPosts from "../functions/newPosts/platforms/blogstopPosts.js";
import type * as functions_newPosts_platforms_substackPost from "../functions/newPosts/platforms/substackPost.js";
import type * as functions_newPosts_platforms_wordpressPosts from "../functions/newPosts/platforms/wordpressPosts.js";
import type * as functions_processBlogs_agents_classifierAgent from "../functions/processBlogs/agents/classifierAgent.js";
import type * as functions_processBlogs_agents_companyAgent from "../functions/processBlogs/agents/companyAgent.js";
import type * as functions_processBlogs_processBlogs from "../functions/processBlogs/processBlogs.js";
import type * as functions_substackBlogs from "../functions/substackBlogs.js";
import type * as helper_blogs from "../helper/blogs.js";
import type * as posts from "../posts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  _client: typeof _client;
  "constant/posts": typeof constant_posts;
  crons: typeof crons;
  "functions/cleanUp": typeof functions_cleanUp;
  "functions/masterCompanies": typeof functions_masterCompanies;
  "functions/masterCompany": typeof functions_masterCompany;
  "functions/masterCompanyList": typeof functions_masterCompanyList;
  "functions/newPosts/checkNewPosts": typeof functions_newPosts_checkNewPosts;
  "functions/newPosts/platforms/blogstopPosts": typeof functions_newPosts_platforms_blogstopPosts;
  "functions/newPosts/platforms/substackPost": typeof functions_newPosts_platforms_substackPost;
  "functions/newPosts/platforms/wordpressPosts": typeof functions_newPosts_platforms_wordpressPosts;
  "functions/processBlogs/agents/classifierAgent": typeof functions_processBlogs_agents_classifierAgent;
  "functions/processBlogs/agents/companyAgent": typeof functions_processBlogs_agents_companyAgent;
  "functions/processBlogs/processBlogs": typeof functions_processBlogs_processBlogs;
  "functions/substackBlogs": typeof functions_substackBlogs;
  "helper/blogs": typeof helper_blogs;
  posts: typeof posts;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
