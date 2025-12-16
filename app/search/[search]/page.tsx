"use client";

import ArticleCard from '@/components/ArticleCard';
import CircularLoader from '@/components/circularLoader';
import { api } from '@/convex/_generated/api';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { useParams } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react'

const Page = () => {
    const params = useParams();
    const searchTerm = decodeURIComponent(params.search as string);

    const searchQuery = usePaginatedQuery(
        api.functions.substackBlogs.searchPosts,
        { searchTerm },
        { initialNumItems: 20 }
    );

    const authorPost = useQuery(api.functions.substackBlogs.searchPostsByAuthor, {
        author: searchTerm
    })

    const { results: companyPost, status, loadMore } = searchQuery;

    const posts = useMemo(() => {
        const base = companyPost ?? [];

        if (!authorPost) return base;

        return Array.isArray(authorPost)
            ? [...authorPost, ...base]
            : [authorPost, ...base];
    }, [companyPost, authorPost]);


    const uniquePosts = useMemo(() => {
        if (!posts) return [];

        const seen = new Set<string>();
        const output = [];

        for (const p of posts) {
            if (!seen.has(p._id)) {
                seen.add(p._id);
                output.push(p);
            }
        }

        return output;
    }, [posts]);

    const isLoading = status === "LoadingFirstPage";
    const isLoadingMore = status === "LoadingMore";
    const canLoadMore = status === "CanLoadMore";

    const loadMoreRef = useRef<HTMLDivElement>(null);
    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
        }

        if (!loadMoreRef.current || !canLoadMore || isLoadingMore) return;

        const currentRef = loadMoreRef.current;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && canLoadMore && !isLoadingMore) {
                    loadMore(20);
                }
            },
            {
                threshold: 0.1,
                rootMargin: "200px", // Increased for better triggering
            }
        );

        observer.observe(currentRef);

        return () => {
            observer.disconnect();
        };
    }, [canLoadMore, isLoadingMore, loadMore, posts]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        console.log(canLoadMore, isLoadingMore, status);
    }, [status]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {isLoading ? (
                    <CircularLoader />
                ) : (
                    <>
                        <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-6">
                            Latest Articles
                        </h1>
                        <div className="space-y-6">
                            {uniquePosts && uniquePosts.length > 0 ? (
                                uniquePosts.map((post) => (
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

                        {/* Keep the trigger div mounted as long as we can load more OR are currently loading */}
                        {(canLoadMore || isLoadingMore) && uniquePosts && uniquePosts.length > 0 && (
                            <div
                                ref={loadMoreRef}
                                className="flex justify-center items-center py-8 min-h-[80px]"
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
                        {status === "Exhausted" && uniquePosts && uniquePosts.length > 0 && (
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
    )
}

export default Page;