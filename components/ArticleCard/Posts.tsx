"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import CircularLoader from "@/components/circularLoader";

type postProps = {
    initialPosts: Doc<"posts">[];
}

export default function Posts({ initialPosts }: postProps) {

    const loadMoreRef = useRef<HTMLDivElement>(null);


    // Regular paginated query (no search)
    const regularQuery = usePaginatedQuery(
        api.functions.substackBlogs.getPaginatedPosts,
        { paginationOpts: {} },
        {
            initialNumItems: 10,
        }
    );

    const status = regularQuery.status;
    const posts =
        status === "LoadingFirstPage"
            ? initialPosts
            : regularQuery.results;
    const loadMore = regularQuery.loadMore;


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
                    loadMore(10);
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

    return (
        <div className="min-h-screen w-full flex ">
            <div className="flex-1 w-6xl md:px-4 md:py-8 h-full">
                {posts ? (<div className="px-4">
                    {/* <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-6">
                            Latest Articles
                        </h1> */}
                    {/* Articles */}
                    <div className="lg:space-y-6 space-y-7">
                        {posts && posts.length > 0 ? (
                            posts.map((post) => (
                                <ArticleCard
                                    key={post._id}
                                    post={post}
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
                </div>):(
                    <CircularLoader/>
                )}
            </div>
        </div>
    );
}