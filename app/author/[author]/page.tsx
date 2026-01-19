"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import { useParams } from "next/navigation";
import CircularLoader from "@/components/circularLoader";
import { useState } from "react";
import { useUser } from "@/context/userContext";
import { useToast } from "@/context/toastContext";
import { GA_EVENT, trackEvent } from "@/lib/analytics/ga";

export default function AuthorPage() {
    const params = useParams();
    const author = decodeURIComponent(params.author as string);

    const { user } = useUser();
    const { addToast } = useToast();
    // -----------------------------
    // Queries
    // -----------------------------
    const posts = useQuery(
        api.functions.substackBlogs.getPostsByAuthor,
        { author }
    );

    // -----------------------------
    // Mutations
    // -----------------------------
    const trackAuthor = useMutation(
        api.functions.tracking.addTracking.trackTarget
    );
    const followAuthor = useMutation(
        api.functions.users.followAuthor
    );
    const untrackAuthor = useMutation(
        api.functions.tracking.addTracking.untrackTarget
    );
    const unFollowAuthor = useMutation(
        api.functions.users.unfollowAuthor
    );

    const [loading, setLoading] = useState(false);

    const isFollowing =
        !!user?.authorsFollowing?.includes(author);

    const handleToggleFollow = async () => {
        trackEvent(GA_EVENT.FOLLOW_AUTHOR_CLICKED, { author: author })
        if (!user) {
            addToast('error', 'Please login to follow', "")
            return
        };

        setLoading(true);
        try {
            if (isFollowing) {
                await untrackAuthor({
                    userId: user._id,
                    targetId: author,
                    targetType: 'author'
                });
                await unFollowAuthor({
                    userId: user._id,
                    authorName: author
                })
            } else {
                await trackAuthor({
                    userId: user._id,
                    targetId: author,
                    targetType: 'author'
                });
                await followAuthor({
                    userId: user._id,
                    authorName: author
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------
    // Loading
    // -----------------------------
    if (posts === undefined) {
        return <CircularLoader />;
    }

    // -----------------------------
    // UI
    // -----------------------------
    return (
        <div className="max-w-6xl mx-auto lg:py-10 py-4 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-indigo-600">
                    Articles by {author}
                </h1>

                <button
                    onClick={handleToggleFollow}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg font-medium transition
              ${isFollowing
                            ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }
            `}
                >
                    {loading
                        ? "Please wait..."
                        : isFollowing
                            ? "Untrack"
                            : "Track"}
                </button>
            </div>

            {/* Empty state */}
            {posts.length === 0 && (
                <p className="text-slate-500">
                    No posts found for this author.
                </p>
            )}

            {/* Posts */}
            <div className="space-y-6">
                {posts.map((post) => (
                    <ArticleCard key={post._id} post={post} />
                ))}
            </div>
        </div>
    );
}
