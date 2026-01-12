import { scrapeBlog } from "./scraper/mainScraper";

(async () => {
  const posts = await scrapeBlog(
    "https://www.fool.com/investing-news/"
  );

  console.log(posts);
})();
