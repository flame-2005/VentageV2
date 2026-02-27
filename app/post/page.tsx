// app/page.tsx (SERVER COMPONENT)
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import ValidItems from "@/components/ItemCard/ValidItem";

export default async function Page() {
    const convex = new ConvexHttpClient(
        process.env.NEXT_PUBLIC_CONVEX_URL!
    );

    const initialPosts = await convex.query(
        api.functions.validItems.getFeedByType,
        {
            paginationOpts: {
                numItems: 10,
                cursor: null,
            },
            sourceType: "post",
        }
    );



    return (
        <ValidItems initialItems={initialPosts.page} sourceType="post"/>
    );
}
