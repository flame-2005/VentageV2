"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import CircularLoader from "@/components/circularLoader";
import { Doc } from "@/convex/_generated/dataModel";
import ValidItemCard, { FeedItem } from "@/components/ItemCard/ValidItemCard";
import { useUser } from "@/context/userContext";

type ValidItemsProps = {
    initialItems: Doc<"validItems">[];
    sourceType?: "post" | "video" | "tweet";
};

type DateGroup = {
    label: string;
    unread: FeedItem[];
    read: FeedItem[];
};

export default function ValidItems({ initialItems, sourceType }: ValidItemsProps) {
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const { user } = useUser();

    const {
        results: feedItems,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.functions.validItems.getFeedByType,
        {
            sourceType,
            userId: user?._id ?? undefined,
        },
        { initialNumItems: 20 }
    );

    const validItems = feedItems || initialItems;

    const readItemClicks = useQuery(
        api.functions.users.getUserReadItemClicks,
        user ? { userId: user._id } : "skip"
    );

    const isLoading = status === "LoadingFirstPage";
    const isLoadingMore = status === "LoadingMore";
    const canLoadMore = status === "CanLoadMore";

    const readClickSet = useMemo(() => {
        const set = new Set<string>();
        (readItemClicks ?? []).forEach((entry) => {
            set.add(entry.itemId.toString());
        });
        return set;
    }, [readItemClicks]);

    const getDateLabel = (dateValue: string | number) => {
        const postDate = new Date(dateValue);
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

    const dateGroups = useMemo(() => {
        const groups: DateGroup[] = [];
        const byLabel = new Map<string, DateGroup>();

        (validItems ?? []).forEach((item) => {
            const label = getDateLabel(item.pubDate);

            if (!byLabel.has(label)) {
                const newGroup: DateGroup = { label, unread: [], read: [] };
                byLabel.set(label, newGroup);
                groups.push(newGroup);
            }

            const group = byLabel.get(label);
            if (!group) return;

            if (readClickSet.has(item._id.toString())) {
                group.read.push(item);
            } else {
                group.unread.push(item);
            }
        });

        return groups;
    }, [validItems, readClickSet]);

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
                                dateGroups.map((group) => (
                                    <div key={group.label} className="space-y-3">
                                        <p className="text-xs font-semibold text-slate-500 text-left">
                                            {group.label}
                                        </p>

                                        {group.unread.map((item) => (
                                            <div key={item._id}>
                                                <ValidItemCard post={item} />
                                            </div>
                                        ))}

                                        {group.read.length > 0 && (
                                            <>
                                                <div className="relative py-1 my-1">
                                                    <div className="h-px bg-slate-200" />
                                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                                        Read
                                                    </span>
                                                </div>

                                                {group.read.map((item) => (
                                                    <div key={item._id}>
                                                        <ValidItemCard post={item} />
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-16">
                                    <div className="text-6xl mb-4">No data</div>
                                    <h3 className="text-xl font-semibold text-slate-700 mb-2">
                                        No content found
                                    </h3>
                                    <p className="text-slate-500">
                                        Nothing available at the moment
                                    </p>
                                </div>
                            )}
                        </div>

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
