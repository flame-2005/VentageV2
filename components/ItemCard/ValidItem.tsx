"use client";

import { useEffect, useRef } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import CircularLoader from "@/components/circularLoader";
import { Doc } from "@/convex/_generated/dataModel";
import ValidItemCard from "@/components/ItemCard/ValidItemCard";

type ValidItemsProps = {
    initialItems: Doc<"validItems">[];
}

export default function ValidItems({ initialItems }: ValidItemsProps) {
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const {
        results: feedItems,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.functions.validItems.getFeedItems,
        { paginationOpts: {} },
        { initialNumItems: 20 }
    );

    const validItems = feedItems || initialItems;

    const isLoading = status === "LoadingFirstPage";
    const isLoadingMore = status === "LoadingMore";
    const canLoadMore = status === "CanLoadMore";

    // 🔥 Infinite Scroll
    useEffect(() => {
        if (!loadMoreRef.current || !canLoadMore || isLoadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && canLoadMore && !isLoadingMore) {
                    loadMore(10);
                }
            },
            {
                threshold: 0.1,
                rootMargin: "100px",
            }
        );

        observer.observe(loadMoreRef.current);

        return () => observer.disconnect();
    }, [canLoadMore, isLoadingMore, loadMore]);

    return (
        <div className="min-h-screen w-full flex">
            <div className="flex-1 w-6xl md:px-4 md:py-8 h-full">
                {isLoading ? (
                    <CircularLoader />
                ) : (
                    <div className="px-4">
                        <div className="space-y-6">
                            {validItems && validItems.length > 0 ? (
                                validItems.map((item: Doc<"validItems">) => {

                                    return <ValidItemCard key={item._id} post={item} />

                                })
                            ) : (
                                <div className="text-center py-16">
                                    <div className="text-6xl mb-4">📊</div>
                                    <h3 className="text-xl font-semibold text-slate-700 mb-2">
                                        No content found
                                    </h3>
                                    <p className="text-slate-500">
                                        Nothing available at the moment
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 🔥 Infinite Scroll Loader */}
                        {(canLoadMore || isLoadingMore) &&
                            validItems &&
                            validItems.length > 0 && (
                                <div
                                    ref={loadMoreRef}
                                    className="flex justify-center items-center py-8"
                                >
                                    {isLoadingMore && (
                                        <div className="flex items-center gap-3 text-blue-500">
                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="font-medium">
                                                Loading more content...
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                        {/* 🔥 End Message */}
                        {status === "Exhausted" &&
                            validItems &&
                            validItems.length > 0 && (
                                <div className="text-center py-8">
                                    <p className="text-slate-500 font-medium">
                                        You&apos;ve reached the end! No more content to load.
                                    </p>
                                </div>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
}