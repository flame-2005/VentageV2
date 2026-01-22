"use client";

import { usePaginatedQuery } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import { useParams } from "next/navigation";
import CircularLoader from "@/components/circularLoader";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@/context/userContext";
import { useToast } from "@/context/toastContext";
import { GA_EVENT, trackEvent } from "@/lib/analytics/ga";

export default function AuthorPage() {
    const params = useParams();
    const author = (() => {
        try {
            return decodeURIComponent(params.author as string);
        } catch {
            return params.author as string;
        }
    })();

    const { user } = useUser();
    const { addToast } = useToast();
    
    // -----------------------------
    // Paginated Query
    // -----------------------------
    const { results: posts, status, loadMore } = usePaginatedQuery(
        api.functions.substackBlogs.getPostsByAuthor,
        { author },
        { initialNumItems: 20 }
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
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const isFollowing = !!user?.authorsFollowing?.includes(author);
    const canLoadMore = status === "CanLoadMore";
    const isLoadingMore = status === "LoadingMore";

    // -----------------------------
    // Infinite Scroll
    // -----------------------------
    useEffect(() => {
        if (!loadMoreRef.current || !canLoadMore || isLoadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && canLoadMore) {
                    loadMore(20);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(loadMoreRef.current);

        return () => observer.disconnect();
    }, [canLoadMore, isLoadingMore, loadMore]);

    const handleToggleFollow = async () => {
        trackEvent(GA_EVENT.FOLLOW_AUTHOR_CLICKED, { author: author });
        
        if (!user?._id) {
            addToast('error', 'Please login to follow', "");
            return;
        }

        setLoading(true);
        try {
            if (isFollowing) {
                await Promise.all([
                    untrackAuthor({
                        userId: user._id,
                        targetId: author,
                        targetType: 'author'
                    }),
                    unFollowAuthor({
                        userId: user._id,
                        authorName: author
                    })
                ]);
            } else {
                await Promise.all([
                    trackAuthor({
                        userId: user._id,
                        targetId: author,
                        targetType: 'author'
                    }),
                    followAuthor({
                        userId: user._id,
                        authorName: author
                    })
                ]);
            }
        } catch (error) {
            console.error('Toggle follow error:', error);
            addToast('error', 'Failed to update follow status', '');
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------
    // Loading
    // -----------------------------
    if (status === "LoadingFirstPage") {
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
            {posts.length === 0 && status !== "CanLoadMore" && (
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

            {/* Infinite Scroll Trigger */}
            {(canLoadMore || isLoadingMore) && posts && posts.length > 0 && (
                <div
                    ref={loadMoreRef}
                    className="flex justify-center items-center py-8"
                >
                    {isLoadingMore && (
                        <div className="flex items-center gap-3 text-blue-500">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="font-medium">Loading more articles...</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}