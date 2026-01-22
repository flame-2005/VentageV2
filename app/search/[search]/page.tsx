"use client";

import ArticleCard from '@/components/ArticleCard/ArticleCard';
import CircularLoader from '@/components/circularLoader';
import { api } from '@/convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useRef } from 'react'

const Page = () => {
    const params = useParams();
    const searchParams = useSearchParams();
    const routeSegment = params.search as string;

    // Determine search type based on route
    const isCompanySearch = routeSegment === 'company';
    const isAuthorSearch = routeSegment === 'author';
    const isSearchEverywhere = routeSegment === 'search-everywhere';

    // Get the actual search value
    const actualSearchTerm = isCompanySearch || isAuthorSearch || isSearchEverywhere
        ? Array.from(searchParams.keys())[0] || ''
        : decodeURIComponent(routeSegment);

    // Use searchEverywhere query with pagination when flag is present
    const everywhereQuery = usePaginatedQuery(
        api.functions.substackBlogs.searchEverywhere,
        isSearchEverywhere ? { searchTerm: actualSearchTerm } : "skip",
        { initialNumItems: 20 }
    );

    // Use company search for company route or generic search
    const searchQuery = usePaginatedQuery(
        api.functions.substackBlogs.searchPosts,
        (isCompanySearch || (!isAuthorSearch && !isSearchEverywhere)) ? { searchTerm: actualSearchTerm } : "skip",
        { initialNumItems: 20 }
    );

    // Use author search with pagination
    const authorQuery = usePaginatedQuery(
        api.functions.substackBlogs.getPostsByAuthor,
        isAuthorSearch ? { author: actualSearchTerm } : "skip",
        { initialNumItems: 20 }
    );

    const { results: companyPost, status: companyStatus, loadMore: loadMoreCompany } = searchQuery;
    const { results: everywhereResults, status: everywhereStatus, loadMore: loadMoreEverywhere } = everywhereQuery;
    const { results: authorPost, status: authorStatus, loadMore: loadMoreAuthor } = authorQuery;

    const posts = useMemo(() => {
        // If search everywhere mode, use those results
        if (isSearchEverywhere) {
            return everywhereResults ?? [];
        }

        // If company-specific search, return only company results
        if (isCompanySearch) {
            return companyPost ?? [];
        }

        // If author-specific search, return only author results
        if (isAuthorSearch) {
            return authorPost ?? [];
        }

        // Generic search - combine both company and author results
        const base = companyPost ?? [];
        const authors = authorPost ?? [];

        return [...authors, ...base];
    }, [
        companyPost,
        authorPost,
        everywhereResults,
        isSearchEverywhere,
        isCompanySearch,
        isAuthorSearch
    ]);

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

    // Determine loading states based on search type
    const status = isSearchEverywhere 
        ? everywhereStatus 
        : isAuthorSearch 
        ? authorStatus 
        : companyStatus;
    
    const loadMore = isSearchEverywhere 
        ? loadMoreEverywhere 
        : isAuthorSearch 
        ? loadMoreAuthor 
        : loadMoreCompany;

    const isLoading = isSearchEverywhere
        ? (everywhereStatus === "LoadingFirstPage")
        : (isCompanySearch 
            ? (companyStatus === "LoadingFirstPage") 
            : (isAuthorSearch 
                ? (authorStatus === "LoadingFirstPage") 
                : (companyStatus === "LoadingFirstPage" || authorStatus === "LoadingFirstPage")));

    const isLoadingMore = status === "LoadingMore";
    const canLoadMore = status === "CanLoadMore";

    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
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
                rootMargin: "200px",
            }
        );

        observer.observe(currentRef);

        return () => {
            observer.disconnect();
        };
    }, [canLoadMore, isLoadingMore, loadMore]);

    // Get display title based on search type
    const getTitle = () => {
        if (isSearchEverywhere) return 'Search Results';
        if (isCompanySearch) return `Company: ${actualSearchTerm}`;
        if (isAuthorSearch) return `Author: ${actualSearchTerm}`;
        return 'Latest Articles';
    };

    return (
        <div className="min-h-screen">
            <div className="flex-1 lg:w-6xl px-4 py-8 h-full">
                {isLoading ? (
                    <CircularLoader />
                ) : (
                    <>
                        <div className="mb-6">
                            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">
                                {getTitle()}
                            </h1>
                        </div>
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
                                        No articles available for {actualSearchTerm}
                                        {isCompanySearch && ' (company search)'}
                                        {isAuthorSearch && ' (author search)'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Infinite scroll trigger */}
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