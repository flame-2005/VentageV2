"use client";

import { usePaginatedQuery } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import VideoCard from "@/components/videoCard/VideoCard";
import { useParams } from "next/navigation";
import CircularLoader from "@/components/circularLoader";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@/context/userContext";
import { useToast } from "@/context/toastContext";
import { GA_EVENT, trackEvent } from "@/lib/analytics/ga";

type Tab = "posts" | "videos";

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

    const [activeTab, setActiveTab] = useState<Tab>("posts");

    // -----------------------------
    // Paginated Queries
    // -----------------------------
    const { results: posts, status: postsStatus, loadMore: loadMorePosts } = usePaginatedQuery(
        api.functions.substackBlogs.getPostsByAuthor,
        { author },
        { initialNumItems: 20 }
    );

    const { results: videos, status: videosStatus, loadMore: loadMoreVideos } = usePaginatedQuery(
        api.functions.videos.getVideosByChannel,
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

    // Active tab data
    const results = activeTab === "posts" ? posts : videos;
    const status = activeTab === "posts" ? postsStatus : videosStatus;
    const loadMore = activeTab === "posts" ? loadMorePosts : loadMoreVideos;

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
    // Loading (only block on first page of active tab)
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
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-blue-600">
                    {author}
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

            {/* Tab Toggle */}
            <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
                {(["posts", "videos"] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium capitalize transition border-b-2 -mb-px
                            ${activeTab === tab
                                ? "border-indigo-600 text-blue-600"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                            }
                        `}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Empty state */}
            {results.length === 0 && status !== "CanLoadMore" && (
                <p className="text-slate-500">
                    No {activeTab} found for this author.
                </p>
            )}

            {/* Posts / Videos */}
            <div className="lg:space-y-6 space-y-7">
                {activeTab === "posts"
                    ? posts.map((post) => (
                        <ArticleCard key={post._id} post={post} />
                    ))
                    : videos.map((video) => (
                        <VideoCard key={video._id} post={video} />
                    ))
                }
            </div>

            {/* Infinite Scroll Trigger */}
            {(canLoadMore || isLoadingMore) && results && results.length > 0 && (
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