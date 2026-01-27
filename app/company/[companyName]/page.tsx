"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import CircularLoader from "@/components/circularLoader";
import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@/context/userContext";
import { useToast } from "@/context/toastContext";
import { GA_EVENT, trackEvent } from "@/lib/analytics/ga";
import { capitalize } from "@/helper/text";

export default function CompanyPage() {
    const params = useParams();
    const company = (() => {
        try {
            return decodeURIComponent(params.companyName as string);
        } catch {
            return params.companyName as string;
        }
    })();
    
    const { addToast } = useToast();
    const { user } = useUser();

    // -----------------------------
    // Paginated Query
    // -----------------------------
    const { results: posts, status, loadMore } = usePaginatedQuery(
        api.functions.substackBlogs.getPostsByCompany,
        { companyName: company },
        { initialNumItems: 20 }
    );

    // -----------------------------
    // Mutations
    // -----------------------------
    const track = useMutation(
        api.functions.tracking.addTracking.trackTarget
    );
    const followCompany = useMutation(
        api.functions.users.followCompany
    );
    const untrack = useMutation(
        api.functions.tracking.addTracking.untrackTarget
    );
    const unfollowCompany = useMutation(
        api.functions.users.unfollowCompany
    );

    const [loading, setLoading] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const isTracking = !!user?.companiesFollowing?.includes(company);
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
            { threshold: 0.1, rootMargin: "200px" }
        );

        observer.observe(loadMoreRef.current);

        return () => observer.disconnect();
    }, [canLoadMore, isLoadingMore, loadMore]);

    const handleToggleTracking = async () => {
        trackEvent(GA_EVENT.TRACK_COMPANY_CLICKED, { company: company });
        
        if (!user?._id) {
            addToast('error', 'Please login to track', "");
            return;
        }

        setLoading(true);
        try {
            if (isTracking) {
                await Promise.all([
                    untrack({
                        userId: user._id,
                        targetType: "company",
                        targetId: company,
                    }),
                    unfollowCompany({
                        companyName: company,
                        userId: user._id
                    })
                ]);
            } else {
                await Promise.all([
                    track({
                        userId: user._id,
                        targetType: "company",
                        targetId: company,
                    }),
                    followCompany({
                        companyName: company,
                        userId: user._id
                    })
                ]);
            }
        } catch (error) {
            console.error('Toggle tracking error:', error);
            addToast('error', 'Failed to update tracking status', '');
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
                <h1 className="text-3xl font-bold text-blue-600">
                    {capitalize(company)}
                </h1>

                <button
                    onClick={handleToggleTracking}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg font-medium transition
                        ${isTracking
                            ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }
                    `}
                >
                    {loading
                        ? "Please wait..."
                        : isTracking
                            ? "Untrack"
                            : "Track"}
                </button>
            </div>

            {/* Empty state */}
            {posts.length === 0 && status !== "CanLoadMore" && (
                <p className="text-slate-500">
                    No posts found for this company.
                </p>
            )}

            {/* Posts */}
            <div className="lg:space-y-6 space-y-7">
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

            {/* End of results message */}
            {status === "Exhausted" && posts && posts.length > 0 && (
                <div className="text-center py-8">
                    <p className="text-slate-500 font-medium">
                        You&apos;ve reached the end! No more articles to load.
                    </p>
                </div>
            )}
        </div>
    );
}