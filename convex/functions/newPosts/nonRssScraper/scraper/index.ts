"use node"

import { Scraper } from "./types";
import { scrapeCompanyDirectory } from "../scrapers/companyDirectory";
import { scrapeLatestList } from "../scrapers/scrapeLoadMore";
import { scrapePLIndiaBlogs } from "../scrapers/scrapePLIndiaBlogs";
import { scrapeStaticPostList } from "../scrapers/scrapeStaticPostList";
import { scrapeMotilalOswalLatest } from "../scrapers/scrapeMotilalOswalLoadMore";
import { scrapeAlphaStreetLatest } from "../scrapers/scrapeAlphaStreetTranscripts";
import { scrapeSurgeCapitalKnowledgeBase } from "../scrapers/scrapeSurgeCapitalKnowledgeBase";
import { scrapeSocInvestBlog } from "../scrapers/scrapeSocInvestBlog";
import { scrapePerpetuityBlog } from "../scrapers/perpetuityBlog";
import { scrapeMJKInvestmentBlog } from "../scrapers/scrapeMJK";
import { scrapeWordpressListing } from "../scrapers/wordpress";

export const SCRAPERS: Scraper[] = [
  {
    name: "socinvest-blog",
    canHandle: (url: string) => url.includes("socinvest.app/blog"),
    scrape: async (url: string) => {
      return scrapeSocInvestBlog(url);
    },
  },

  {
    name: "MJK",
    canHandle: (url: string) => url.includes("mjkinvestment.com/Blog"),

    scrape: async (url: string) => {
      return scrapeMJKInvestmentBlog(url);
    },
  },
  {
    name: "perpetuity",
    canHandle: (url: string) => url.includes("perpetuity.co.in/blog"),
    scrape: async (url: string) => {
      return scrapePerpetuityBlog(url);
    },
  },
  {
    name: "surgecapital-knowledge-base",
    canHandle: (url: string) => url.includes("surgecapital.in/knowledge-base"),
    scrape: async (url: string) => {
      return scrapeSurgeCapitalKnowledgeBase(url);
    },
  },
  {
    name: "alphastreet-transcripts",
    canHandle: (url: string) => url.includes("alphastreet.com"),
    scrape: async (url: string) => {
      return scrapeAlphaStreetLatest(url);
    },
  },

  // {
  //   name: "abhayjain-writings",
  //   canHandle: (url: string) => url.includes("abhayjain.com/writings"),
  //   scrape: async (url: string) => {
  //     const res = await fetch(url, {
  //       headers: { "User-Agent": "Mozilla/5.0" },
  //     });
  //     const html = await res.text();
  //     return scrapeAbhayJainWritings(html, url);
  //   },
  // },

  {
    name: "motilal-oswal-load-more",
    canHandle: (url: string) =>
      url.includes("motilaloswal.com/learning-centre"),
    scrape: async (url: string) => {
      return scrapeMotilalOswalLatest(url);
    },
  },
  {
    name: "static-post-list",
    canHandle: (url: string) => url.includes("/blogs") && !url.includes("page"),
    scrape: async (url: string) => {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const html = await res.text();

      return scrapeStaticPostList(html, url, {
        itemSelector: ".blog-list-item",
        titleSelector: "h3",
        imageSelector: "img",
      });
    },
  },
  {
    name: "plindia-static-blogs",
    canHandle: (url: string) => url.includes("plindia.com/blogs"),
    scrape: async (url: string) => {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const html = await res.text();
      return scrapePLIndiaBlogs(html, url);
    },
  },
  {
    name: "load-more-list",
    canHandle: (url: string) =>
      url.includes("motilaloswal.com/learning-centre"),
    scrape: async (url: string) => {
      return scrapeLatestList(url, {
        itemSelector: "a.blog-item",
        linkSelector: "a.blog-item",
        titleSelector: ".bi-title",
        authorSelector: ".blog-item-author",
        dateSelector: ".blog-item-info span:first-child",
      });
    },
  },
  {
    name: "company-directory",
    scrape: async (url: string) => {
      const res = await fetch(url);
      const html = await res.text();
      return scrapeCompanyDirectory(html, url);
    },
  },
  {
    name: "wordpress",
    scrape: async (url: string) => {
      const res = await fetch(url);
      const html = await res.text();
      return scrapeWordpressListing(html, url);
    },
  },
];
