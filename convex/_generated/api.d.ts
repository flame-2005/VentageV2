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
import type * as functions_bugs from "../functions/bugs.js";
import type * as functions_cleanUp from "../functions/cleanUp.js";
import type * as functions_enrichCompanies from "../functions/enrichCompanies.js";
import type * as functions_fetch_agents_agent1 from "../functions/fetch/agents/agent1.js";
import type * as functions_fetch_agents_agent2 from "../functions/fetch/agents/agent2.js";
import type * as functions_fetch_getAllRssPosts from "../functions/fetch/getAllRssPosts.js";
import type * as functions_fetch_universalRssFetcher from "../functions/fetch/universalRssFetcher.js";
import type * as functions_masterCompanies from "../functions/masterCompanies.js";
import type * as functions_masterCompany from "../functions/masterCompany.js";
import type * as functions_masterCompanyList from "../functions/masterCompanyList.js";
import type * as functions_newPosts_checkNewPosts from "../functions/newPosts/checkNewPosts.js";
import type * as functions_newPosts_nonRssScraper_images_extractAuthorSmart from "../functions/newPosts/nonRssScraper/images/extractAuthorSmart.js";
import type * as functions_newPosts_nonRssScraper_images_smartPubDate from "../functions/newPosts/nonRssScraper/images/smartPubDate.js";
import type * as functions_newPosts_nonRssScraper_scraper_index from "../functions/newPosts/nonRssScraper/scraper/index.js";
import type * as functions_newPosts_nonRssScraper_scraper_mainScraper from "../functions/newPosts/nonRssScraper/scraper/mainScraper.js";
import type * as functions_newPosts_nonRssScraper_scraper_types from "../functions/newPosts/nonRssScraper/scraper/types.js";
import type * as functions_newPosts_nonRssScraper_scrapers_companyDirectory from "../functions/newPosts/nonRssScraper/scrapers/companyDirectory.js";
import type * as functions_newPosts_nonRssScraper_scrapers_investingStoticScraper from "../functions/newPosts/nonRssScraper/scrapers/investingStoticScraper.js";
import type * as functions_newPosts_nonRssScraper_scrapers_perpetuityBlog from "../functions/newPosts/nonRssScraper/scrapers/perpetuityBlog.js";
import type * as functions_newPosts_nonRssScraper_scrapers_poocketFullScraper from "../functions/newPosts/nonRssScraper/scrapers/poocketFullScraper.js";
import type * as functions_newPosts_nonRssScraper_scrapers_recipScraper from "../functions/newPosts/nonRssScraper/scrapers/recipScraper.js";
import type * as functions_newPosts_nonRssScraper_scrapers_rupeetingBlogs from "../functions/newPosts/nonRssScraper/scrapers/rupeetingBlogs.js";
import type * as functions_newPosts_nonRssScraper_scrapers_scrapeAlphaStreetTranscripts from "../functions/newPosts/nonRssScraper/scrapers/scrapeAlphaStreetTranscripts.js";
import type * as functions_newPosts_nonRssScraper_scrapers_scrapeLoadMore from "../functions/newPosts/nonRssScraper/scrapers/scrapeLoadMore.js";
import type * as functions_newPosts_nonRssScraper_scrapers_scrapeMJK from "../functions/newPosts/nonRssScraper/scrapers/scrapeMJK.js";
import type * as functions_newPosts_nonRssScraper_scrapers_scrapeMotilalOswalLoadMore from "../functions/newPosts/nonRssScraper/scrapers/scrapeMotilalOswalLoadMore.js";
import type * as functions_newPosts_nonRssScraper_scrapers_scrapePLIndiaBlogs from "../functions/newPosts/nonRssScraper/scrapers/scrapePLIndiaBlogs.js";
import type * as functions_newPosts_nonRssScraper_scrapers_scrapeSocInvestBlog from "../functions/newPosts/nonRssScraper/scrapers/scrapeSocInvestBlog.js";
import type * as functions_newPosts_nonRssScraper_scrapers_scrapeStaticPostList from "../functions/newPosts/nonRssScraper/scrapers/scrapeStaticPostList.js";
import type * as functions_newPosts_nonRssScraper_scrapers_scrapeSurgeCapitalKnowledgeBase from "../functions/newPosts/nonRssScraper/scrapers/scrapeSurgeCapitalKnowledgeBase.js";
import type * as functions_newPosts_nonRssScraper_scrapers_wordpress from "../functions/newPosts/nonRssScraper/scrapers/wordpress.js";
import type * as functions_newPosts_nonRssScraper_utils_buildSelector from "../functions/newPosts/nonRssScraper/utils/buildSelector.js";
import type * as functions_newPosts_nonRssScraper_utils_delay from "../functions/newPosts/nonRssScraper/utils/delay.js";
import type * as functions_newPosts_nonRssScraper_utils_posts from "../functions/newPosts/nonRssScraper/utils/posts.js";
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
import type * as functions_newVideos_extractTranscript from "../functions/newVideos/extractTranscript.js";
import type * as functions_newVideos_getLatestVideos from "../functions/newVideos/getLatestVideos.js";
import type * as functions_newVideos_index from "../functions/newVideos/index.js";
import type * as functions_newVideos_processVideos from "../functions/newVideos/processVideos.js";
import type * as functions_processBlogs_agents_classifierAgent from "../functions/processBlogs/agents/classifierAgent.js";
import type * as functions_processBlogs_agents_companyAgent from "../functions/processBlogs/agents/companyAgent.js";
import type * as functions_processBlogs_newTaggingAlgo_Agents_ClassificationAgent from "../functions/processBlogs/newTaggingAlgo/Agents/ClassificationAgent.js";
import type * as functions_processBlogs_newTaggingAlgo_Agents_VectorDBMatcher from "../functions/processBlogs/newTaggingAlgo/Agents/VectorDBMatcher.js";
import type * as functions_processBlogs_newTaggingAlgo_Agents_extractCompanies from "../functions/processBlogs/newTaggingAlgo/Agents/extractCompanies.js";
import type * as functions_processBlogs_newTaggingAlgo_Agents_summarizeAgent from "../functions/processBlogs/newTaggingAlgo/Agents/summarizeAgent.js";
import type * as functions_processBlogs_newTaggingAlgo_Agents_varifyCompanies from "../functions/processBlogs/newTaggingAlgo/Agents/varifyCompanies.js";
import type * as functions_processBlogs_newTaggingAlgo_index from "../functions/processBlogs/newTaggingAlgo/index.js";
import type * as functions_processBlogs_processBlogs from "../functions/processBlogs/processBlogs.js";
import type * as functions_substackBlogs from "../functions/substackBlogs.js";
import type * as functions_tracking_addTracking from "../functions/tracking/addTracking.js";
import type * as functions_tracking_notification from "../functions/tracking/notification.js";
import type * as functions_users from "../functions/users.js";
import type * as functions_usersLink from "../functions/usersLink.js";
import type * as functions_videos from "../functions/videos.js";
import type * as helper_addBlogImage from "../helper/addBlogImage.js";
import type * as helper_addBulkBlogs from "../helper/addBulkBlogs.js";
import type * as helper_addImage from "../helper/addImage.js";
import type * as helper_agents_extractImage from "../helper/agents/extractImage.js";
import type * as helper_blogs from "../helper/blogs.js";
import type * as helper_classifyBlog from "../helper/classifyBlog.js";
import type * as helper_enrichMasterCompanies from "../helper/enrichMasterCompanies.js";
import type * as helper_feedParser from "../helper/feedParser.js";
import type * as helper_masterCompanies from "../helper/masterCompanies.js";
import type * as helper_post from "../helper/post.js";
import type * as posts from "../posts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _client: typeof _client;
  "constant/blogs": typeof constant_blogs;
  "constant/fetcher": typeof constant_fetcher;
  "constant/posts": typeof constant_posts;
  crons: typeof crons;
  "functions/blogs": typeof functions_blogs;
  "functions/bugs": typeof functions_bugs;
  "functions/cleanUp": typeof functions_cleanUp;
  "functions/enrichCompanies": typeof functions_enrichCompanies;
  "functions/fetch/agents/agent1": typeof functions_fetch_agents_agent1;
  "functions/fetch/agents/agent2": typeof functions_fetch_agents_agent2;
  "functions/fetch/getAllRssPosts": typeof functions_fetch_getAllRssPosts;
  "functions/fetch/universalRssFetcher": typeof functions_fetch_universalRssFetcher;
  "functions/masterCompanies": typeof functions_masterCompanies;
  "functions/masterCompany": typeof functions_masterCompany;
  "functions/masterCompanyList": typeof functions_masterCompanyList;
  "functions/newPosts/checkNewPosts": typeof functions_newPosts_checkNewPosts;
  "functions/newPosts/nonRssScraper/images/extractAuthorSmart": typeof functions_newPosts_nonRssScraper_images_extractAuthorSmart;
  "functions/newPosts/nonRssScraper/images/smartPubDate": typeof functions_newPosts_nonRssScraper_images_smartPubDate;
  "functions/newPosts/nonRssScraper/scraper/index": typeof functions_newPosts_nonRssScraper_scraper_index;
  "functions/newPosts/nonRssScraper/scraper/mainScraper": typeof functions_newPosts_nonRssScraper_scraper_mainScraper;
  "functions/newPosts/nonRssScraper/scraper/types": typeof functions_newPosts_nonRssScraper_scraper_types;
  "functions/newPosts/nonRssScraper/scrapers/companyDirectory": typeof functions_newPosts_nonRssScraper_scrapers_companyDirectory;
  "functions/newPosts/nonRssScraper/scrapers/investingStoticScraper": typeof functions_newPosts_nonRssScraper_scrapers_investingStoticScraper;
  "functions/newPosts/nonRssScraper/scrapers/perpetuityBlog": typeof functions_newPosts_nonRssScraper_scrapers_perpetuityBlog;
  "functions/newPosts/nonRssScraper/scrapers/poocketFullScraper": typeof functions_newPosts_nonRssScraper_scrapers_poocketFullScraper;
  "functions/newPosts/nonRssScraper/scrapers/recipScraper": typeof functions_newPosts_nonRssScraper_scrapers_recipScraper;
  "functions/newPosts/nonRssScraper/scrapers/rupeetingBlogs": typeof functions_newPosts_nonRssScraper_scrapers_rupeetingBlogs;
  "functions/newPosts/nonRssScraper/scrapers/scrapeAlphaStreetTranscripts": typeof functions_newPosts_nonRssScraper_scrapers_scrapeAlphaStreetTranscripts;
  "functions/newPosts/nonRssScraper/scrapers/scrapeLoadMore": typeof functions_newPosts_nonRssScraper_scrapers_scrapeLoadMore;
  "functions/newPosts/nonRssScraper/scrapers/scrapeMJK": typeof functions_newPosts_nonRssScraper_scrapers_scrapeMJK;
  "functions/newPosts/nonRssScraper/scrapers/scrapeMotilalOswalLoadMore": typeof functions_newPosts_nonRssScraper_scrapers_scrapeMotilalOswalLoadMore;
  "functions/newPosts/nonRssScraper/scrapers/scrapePLIndiaBlogs": typeof functions_newPosts_nonRssScraper_scrapers_scrapePLIndiaBlogs;
  "functions/newPosts/nonRssScraper/scrapers/scrapeSocInvestBlog": typeof functions_newPosts_nonRssScraper_scrapers_scrapeSocInvestBlog;
  "functions/newPosts/nonRssScraper/scrapers/scrapeStaticPostList": typeof functions_newPosts_nonRssScraper_scrapers_scrapeStaticPostList;
  "functions/newPosts/nonRssScraper/scrapers/scrapeSurgeCapitalKnowledgeBase": typeof functions_newPosts_nonRssScraper_scrapers_scrapeSurgeCapitalKnowledgeBase;
  "functions/newPosts/nonRssScraper/scrapers/wordpress": typeof functions_newPosts_nonRssScraper_scrapers_wordpress;
  "functions/newPosts/nonRssScraper/utils/buildSelector": typeof functions_newPosts_nonRssScraper_utils_buildSelector;
  "functions/newPosts/nonRssScraper/utils/delay": typeof functions_newPosts_nonRssScraper_utils_delay;
  "functions/newPosts/nonRssScraper/utils/posts": typeof functions_newPosts_nonRssScraper_utils_posts;
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
  "functions/newVideos/extractTranscript": typeof functions_newVideos_extractTranscript;
  "functions/newVideos/getLatestVideos": typeof functions_newVideos_getLatestVideos;
  "functions/newVideos/index": typeof functions_newVideos_index;
  "functions/newVideos/processVideos": typeof functions_newVideos_processVideos;
  "functions/processBlogs/agents/classifierAgent": typeof functions_processBlogs_agents_classifierAgent;
  "functions/processBlogs/agents/companyAgent": typeof functions_processBlogs_agents_companyAgent;
  "functions/processBlogs/newTaggingAlgo/Agents/ClassificationAgent": typeof functions_processBlogs_newTaggingAlgo_Agents_ClassificationAgent;
  "functions/processBlogs/newTaggingAlgo/Agents/VectorDBMatcher": typeof functions_processBlogs_newTaggingAlgo_Agents_VectorDBMatcher;
  "functions/processBlogs/newTaggingAlgo/Agents/extractCompanies": typeof functions_processBlogs_newTaggingAlgo_Agents_extractCompanies;
  "functions/processBlogs/newTaggingAlgo/Agents/summarizeAgent": typeof functions_processBlogs_newTaggingAlgo_Agents_summarizeAgent;
  "functions/processBlogs/newTaggingAlgo/Agents/varifyCompanies": typeof functions_processBlogs_newTaggingAlgo_Agents_varifyCompanies;
  "functions/processBlogs/newTaggingAlgo/index": typeof functions_processBlogs_newTaggingAlgo_index;
  "functions/processBlogs/processBlogs": typeof functions_processBlogs_processBlogs;
  "functions/substackBlogs": typeof functions_substackBlogs;
  "functions/tracking/addTracking": typeof functions_tracking_addTracking;
  "functions/tracking/notification": typeof functions_tracking_notification;
  "functions/users": typeof functions_users;
  "functions/usersLink": typeof functions_usersLink;
  "functions/videos": typeof functions_videos;
  "helper/addBlogImage": typeof helper_addBlogImage;
  "helper/addBulkBlogs": typeof helper_addBulkBlogs;
  "helper/addImage": typeof helper_addImage;
  "helper/agents/extractImage": typeof helper_agents_extractImage;
  "helper/blogs": typeof helper_blogs;
  "helper/classifyBlog": typeof helper_classifyBlog;
  "helper/enrichMasterCompanies": typeof helper_enrichMasterCompanies;
  "helper/feedParser": typeof helper_feedParser;
  "helper/masterCompanies": typeof helper_masterCompanies;
  "helper/post": typeof helper_post;
  posts: typeof posts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
