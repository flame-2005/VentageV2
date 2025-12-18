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
import type * as constant_blogs from "../constant/blogs.js";
import type * as constant_fetcher from "../constant/fetcher.js";
import type * as constant_posts from "../constant/posts.js";
import type * as crons from "../crons.js";
import type * as functions_blogs from "../functions/blogs.js";
import type * as functions_cleanUp from "../functions/cleanUp.js";
import type * as functions_masterCompanies from "../functions/masterCompanies.js";
import type * as functions_masterCompany from "../functions/masterCompany.js";
import type * as functions_masterCompanyList from "../functions/masterCompanyList.js";
import type * as functions_newPosts_checkNewPosts from "../functions/newPosts/checkNewPosts.js";
import type * as functions_newPosts_platforms_blogsiteFetchers_extractPostsFromHTML from "../functions/newPosts/platforms/blogsiteFetchers/extractPostsFromHTML.js";
import type * as functions_newPosts_platforms_blogsiteFetchers_extractRss from "../functions/newPosts/platforms/blogsiteFetchers/extractRss.js";
import type * as functions_newPosts_platforms_blogsiteFetchers_fetchHTML from "../functions/newPosts/platforms/blogsiteFetchers/fetchHTML.js";
import type * as functions_newPosts_platforms_blogsiteFetchers_getPostsFromRss from "../functions/newPosts/platforms/blogsiteFetchers/getPostsFromRss.js";
import type * as functions_newPosts_platforms_blogsiteFetchers_main from "../functions/newPosts/platforms/blogsiteFetchers/main.js";
import type * as functions_newPosts_platforms_blogsiteFetchers_paginatedCrawler from "../functions/newPosts/platforms/blogsiteFetchers/paginatedCrawler.js";
import type * as functions_newPosts_platforms_blogstopPosts from "../functions/newPosts/platforms/blogstopPosts.js";
import type * as functions_newPosts_platforms_mediumPosts from "../functions/newPosts/platforms/mediumPosts.js";
import type * as functions_newPosts_platforms_substackPost from "../functions/newPosts/platforms/substackPost.js";
import type * as functions_newPosts_platforms_wordpressPosts from "../functions/newPosts/platforms/wordpressPosts.js";
import type * as functions_processBlogs_agents_classifierAgent from "../functions/processBlogs/agents/classifierAgent.js";
import type * as functions_processBlogs_agents_companyAgent from "../functions/processBlogs/agents/companyAgent.js";
import type * as functions_processBlogs_processBlogs from "../functions/processBlogs/processBlogs.js";
import type * as functions_substackBlogs from "../functions/substackBlogs.js";
import type * as functions_users from "../functions/users.js";
import type * as helper_addBlogImage from "../helper/addBlogImage.js";
import type * as helper_addBulkBlogs from "../helper/addBulkBlogs.js";
import type * as helper_addImage from "../helper/addImage.js";
import type * as helper_agents_extractImage from "../helper/agents/extractImage.js";
import type * as helper_blogs from "../helper/blogs.js";
import type * as helper_classifyBlog from "../helper/classifyBlog.js";
import type * as helper_feedParser from "../helper/feedParser.js";
import type * as helper_masterCompanies from "../helper/masterCompanies.js";
import type * as helper_post from "../helper/post.js";
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
  "constant/blogs": typeof constant_blogs;
  "constant/fetcher": typeof constant_fetcher;
  "constant/posts": typeof constant_posts;
  crons: typeof crons;
  "functions/blogs": typeof functions_blogs;
  "functions/cleanUp": typeof functions_cleanUp;
  "functions/masterCompanies": typeof functions_masterCompanies;
  "functions/masterCompany": typeof functions_masterCompany;
  "functions/masterCompanyList": typeof functions_masterCompanyList;
  "functions/newPosts/checkNewPosts": typeof functions_newPosts_checkNewPosts;
  "functions/newPosts/platforms/blogsiteFetchers/extractPostsFromHTML": typeof functions_newPosts_platforms_blogsiteFetchers_extractPostsFromHTML;
  "functions/newPosts/platforms/blogsiteFetchers/extractRss": typeof functions_newPosts_platforms_blogsiteFetchers_extractRss;
  "functions/newPosts/platforms/blogsiteFetchers/fetchHTML": typeof functions_newPosts_platforms_blogsiteFetchers_fetchHTML;
  "functions/newPosts/platforms/blogsiteFetchers/getPostsFromRss": typeof functions_newPosts_platforms_blogsiteFetchers_getPostsFromRss;
  "functions/newPosts/platforms/blogsiteFetchers/main": typeof functions_newPosts_platforms_blogsiteFetchers_main;
  "functions/newPosts/platforms/blogsiteFetchers/paginatedCrawler": typeof functions_newPosts_platforms_blogsiteFetchers_paginatedCrawler;
  "functions/newPosts/platforms/blogstopPosts": typeof functions_newPosts_platforms_blogstopPosts;
  "functions/newPosts/platforms/mediumPosts": typeof functions_newPosts_platforms_mediumPosts;
  "functions/newPosts/platforms/substackPost": typeof functions_newPosts_platforms_substackPost;
  "functions/newPosts/platforms/wordpressPosts": typeof functions_newPosts_platforms_wordpressPosts;
  "functions/processBlogs/agents/classifierAgent": typeof functions_processBlogs_agents_classifierAgent;
  "functions/processBlogs/agents/companyAgent": typeof functions_processBlogs_agents_companyAgent;
  "functions/processBlogs/processBlogs": typeof functions_processBlogs_processBlogs;
  "functions/substackBlogs": typeof functions_substackBlogs;
  "functions/users": typeof functions_users;
  "helper/addBlogImage": typeof helper_addBlogImage;
  "helper/addBulkBlogs": typeof helper_addBulkBlogs;
  "helper/addImage": typeof helper_addImage;
  "helper/agents/extractImage": typeof helper_agents_extractImage;
  "helper/blogs": typeof helper_blogs;
  "helper/classifyBlog": typeof helper_classifyBlog;
  "helper/feedParser": typeof helper_feedParser;
  "helper/masterCompanies": typeof helper_masterCompanies;
  "helper/post": typeof helper_post;
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
