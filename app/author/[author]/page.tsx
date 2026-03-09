"use client";

import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useSearchParams } from "next/navigation";
import CircularLoader from "@/components/circularLoader";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@/context/userContext";
import { useToast } from "@/context/toastContext";
import { GA_EVENT, trackEvent } from "@/lib/analytics/ga";
import ValidItemCard from "@/components/ItemCard/ValidItemCard";

function useAuthorContent(author: string, sourceType: "post" | "video") {
    const { user } = useUser();
    return usePaginatedQuery(
        api.functions.validItems.getValidItemsByAuthor,
        { sourceType, authorName: author, userId: user?._id },
        { initialNumItems: 20 }
    );
}

export default function AuthorPage() {
    const params = useParams();
    const searchParams = useSearchParams();

    const { user } = useUser();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);

    const author = useMemo(() => {
        const rawAuthor = params.author as string;
        try {
            return decodeURIComponent(rawAuthor);
        } catch {
            return rawAuthor;
        }
    }, [params.author]);

    const sourceType = useMemo<"post" | "video">(() => {
        const source = searchParams.get("source")?.toLowerCase();
        if (source === "video" || source === "videos") return "video";
        return "post";
    }, [searchParams]);

    const { results, status, loadMore } = useAuthorContent(author, sourceType);

    const trackAuthor = useMutation(api.functions.tracking.addTracking.trackTarget);
    const followAuthor = useMutation(api.functions.users.followAuthor);
    const untrackAuthor = useMutation(api.functions.tracking.addTracking.untrackTarget);
    const unFollowAuthor = useMutation(api.functions.users.unfollowAuthor);

    const isFollowing = !!user?.authorsFollowing?.includes(author);
    const canLoadMore = status === "CanLoadMore";
    const isLoadingMore = status === "LoadingMore";

    const getDateLabel = (pubDate: string) => {
        const postDate = new Date(pubDate);
        if (Number.isNaN(postDate.getTime())) return "";

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const postDay = new Date(
            postDate.getFullYear(),
            postDate.getMonth(),
            postDate.getDate()
        );

        if (postDay.getTime() === today.getTime()) return "Today";
        if (postDay.getTime() === yesterday.getTime()) return "Yesterday";

        return postDate.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el || !canLoadMore || isLoadingMore) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) loadMore(20);
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [canLoadMore, isLoadingMore, loadMore]);

    const handleToggleFollow = useCallback(async () => {
        trackEvent(GA_EVENT.FOLLOW_AUTHOR_CLICKED, { author });

        if (!user?._id) {
            addToast("error", "Please login to follow", "");
            return;
        }

        setLoading(true);
        try {
            if (isFollowing) {
                await Promise.all([
                    untrackAuthor({ userId: user._id, targetId: author, targetType: "author" }),
                    unFollowAuthor({ userId: user._id, authorName: author }),
                ]);
            } else {
                await Promise.all([
                    trackAuthor({ userId: user._id, targetId: author, targetType: "author" }),
                    followAuthor({ userId: user._id, authorName: author }),
                ]);
            }
        } catch (error) {
            console.error("Toggle follow error:", error);
            addToast("error", "Failed to update follow status", "");
        } finally {
            setLoading(false);
        }
    }, [author, isFollowing, user, trackAuthor, followAuthor, untrackAuthor, unFollowAuthor, addToast]);

    if (status === "LoadingFirstPage") return <CircularLoader />;

    return (
        <div className="max-w-6xl mx-auto lg:py-10 py-4 px-4">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-blue-600">{author}</h1>
                <button
                    onClick={handleToggleFollow}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                        isFollowing
                            ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                >
                    {loading ? "Please wait..." : isFollowing ? "Untrack" : "Track"}
                </button>
            </div>

            {results.length === 0 && !canLoadMore && (
                <p className="text-slate-500">No results found for this author.</p>
            )}

            <div className="lg:space-y-6 space-y-7">
                {results.map((item, index) => {
                    const currentLabel = getDateLabel(item.pubDate);
                    const prevLabel = index > 0 ? getDateLabel(results[index - 1].pubDate) : "";
                    const showDateLabel = currentLabel && currentLabel !== prevLabel;

                    return (
                        <div key={item._id}>
                            {showDateLabel && (
                                <p className="text-xs font-semibold text-slate-500 mb-2 text-left">
                                    {currentLabel}
                                </p>
                            )}
                            <ValidItemCard post={item} />
                        </div>
                    );
                })}
            </div>

            {(canLoadMore || isLoadingMore) && results.length > 0 && (
                <div ref={loadMoreRef} className="flex justify-center items-center py-8">
                    {isLoadingMore && (
                        <div className="flex items-center gap-3 text-blue-500">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="font-medium">Loading more...</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
