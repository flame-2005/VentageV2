"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import ArticleCard from "@/components/ArticleCard";
import CircularLoader from "@/components/circularLoader";
import { useSearch } from "@/context/searchContext";

export default function InvestmentDashboard() {
    const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
    const loadMoreRef = useRef<HTMLDivElement>(null);
    
    // Get search term from context
    const { searchTerm } = useSearch();

    // Regular paginated query (no search)
    const regularQuery = usePaginatedQuery(
        api.functions.substackBlogs.getPaginatedPosts,
        {},
        { initialNumItems: 20 }
    );

    // Search query (with search term)
    const searchQuery = usePaginatedQuery(
        api.functions.substackBlogs.searchPosts,
        { searchTerm: searchTerm || "" },
        { initialNumItems: 20 }
    );

    // Use the appropriate query based on whether search term exists
    const { results: posts, status, loadMore } = searchTerm 
        ? searchQuery 
        : regularQuery;

    // Check loading states
    const isLoading = status === "LoadingFirstPage";
    const isLoadingMore = status === "LoadingMore";
    const canLoadMore = status === "CanLoadMore";

    // Infinite scroll: Load more when user scrolls to bottom
    useEffect(() => {
        if (!loadMoreRef.current || !canLoadMore || isLoadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // When the loader div is visible, load more
                if (entries[0].isIntersecting && canLoadMore && !isLoadingMore) {
                    loadMore(20);
                }
            },
            {
                threshold: 0.1, // Trigger when 10% of the element is visible
                rootMargin: "100px", // Start loading 100px before reaching the element
            }
        );

        observer.observe(loadMoreRef.current);

        return () => observer.disconnect();
    }, [canLoadMore, isLoadingMore, loadMore]);

    const toggleLike = (postId: Id<"posts">) => {
        setLikedPosts((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
            }
            return newSet;
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {isLoading ? (
                    <CircularLoader />
                ) : (
                    <>
                        {/* Articles */}
                        <div className="space-y-6">
                            {posts && posts.length > 0 ? (
                                posts.map((post) => (
                                    <ArticleCard
                                        key={post._id}
                                        post={post}
                                        likedPosts={likedPosts}
                                        toggleLike={toggleLike}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-16">
                                    <div className="text-6xl mb-4">📊</div>
                                    <h3 className="text-xl font-semibold text-slate-700 mb-2">
                                        No articles found
                                    </h3>
                                    <p className="text-slate-500 mb-4">
                                        No articles available at the moment
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Infinite scroll trigger + Loading indicator */}
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
                    </>
                )}
            </div>
        </div>
    );
}