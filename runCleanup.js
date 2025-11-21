import { ConvexClient } from "convex/browser"; 
// or:  import { ConvexHttpClient } from "convex/browser";

const client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function run() {
  try {
    const result = await client.action("removeHeavyFields");
    console.log(result);
  } catch (err) {
    console.error("Error running cleanup:", err);
  }
}

run();
