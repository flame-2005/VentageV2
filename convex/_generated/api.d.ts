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
import type * as cronEntry_fetchFeed from "../cronEntry/fetchFeed.js";
import type * as crons from "../crons.js";
import type * as functions_cleanUp from "../functions/cleanUp.js";
import type * as functions_labeling from "../functions/labeling.js";
import type * as functions_masterCompanies from "../functions/masterCompanies.js";
import type * as functions_masterCompany from "../functions/masterCompany.js";
import type * as functions_masterCompanyList from "../functions/masterCompanyList.js";
import type * as functions_substackBlogs from "../functions/substackBlogs.js";
import type * as functions_wordPressBlogs from "../functions/wordPressBlogs.js";
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
  "cronEntry/fetchFeed": typeof cronEntry_fetchFeed;
  crons: typeof crons;
  "functions/cleanUp": typeof functions_cleanUp;
  "functions/labeling": typeof functions_labeling;
  "functions/masterCompanies": typeof functions_masterCompanies;
  "functions/masterCompany": typeof functions_masterCompany;
  "functions/masterCompanyList": typeof functions_masterCompanyList;
  "functions/substackBlogs": typeof functions_substackBlogs;
  "functions/wordPressBlogs": typeof functions_wordPressBlogs;
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
