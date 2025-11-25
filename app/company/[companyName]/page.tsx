"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ArticleCard from "@/components/ArticleCard";
import CircularLoader from "@/components/circularLoader";
import { useParams } from "next/navigation";

export default function CompanyPage() {
    const params = useParams();
    const company = decodeURIComponent(params.companyName as string);

    const posts = useQuery(api.functions.substackBlogs.getPostsByCompany, { companyName: company });

    if (posts === undefined) return <CircularLoader />;

    return (
        <div className="max-w-5xl mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold mb-6 text-blue-600">
                Posts about {company}
            </h1>

            {posts.length === 0 && (
                <p className="text-slate-500">No posts found for this company.</p>
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
