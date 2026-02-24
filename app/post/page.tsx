// app/page.tsx (SERVER COMPONENT)
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import Posts from "@/components/ArticleCard/Posts";

export default async function Page() {
    const convex = new ConvexHttpClient(
        process.env.NEXT_PUBLIC_CONVEX_URL!
    );

    const initialPosts = await convex.query(
        api.functions.substackBlogs.getPaginatedPosts,
        {
            paginationOpts: {
                numItems: 10,
                cursor: null,
            },
        }
    );



    return (
        <Posts initialPosts={initialPosts.page} />
    );
}
