"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ArticleCard from "@/components/ArticleCard";
import { useParams } from "next/navigation";
import CircularLoader from "@/components/circularLoader";

export default function AuthorPage() {
    const params = useParams();
    const author = decodeURIComponent(params.author as string);

    const posts = useQuery(api.functions.substackBlogs.getPostsByAuthor, { author });

    if (posts === undefined) return <CircularLoader />;

    return (
        <div className="max-w-7xl mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold mb-6 text-indigo-600">
                Articles by {author}
            </h1>

            {posts.length === 0 && (
                <p className="text-slate-500">No posts found for this author.</p>
            )}

            <div className="space-y-6">
                {posts.map((post) => (
                    <ArticleCard
                        key={post._id}
                        post={post}
                        likedPosts={new Set()}
                        toggleLike={() => { }}
                    />
                ))}
            </div>
        </div>
    );
}
