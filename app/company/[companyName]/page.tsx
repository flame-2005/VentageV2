"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import CircularLoader from "@/components/circularLoader";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/context/userContext";
import { useToast } from "@/context/toastContext";
import { GA_EVENT, trackEvent } from "@/lib/analytics/ga";

export default function CompanyPage() {
    const params = useParams();
    const company = decodeURIComponent(params.companyName as string);
    const { addToast } = useToast()
    const { user } = useUser();

    const posts = useQuery(
        api.functions.substackBlogs.getPostsByCompany,
        { companyName: company }
    );

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

    const isTracking =
        !!user?.companiesFollowing?.includes(company);

    const handleToggleTracking = async () => {
        trackEvent(GA_EVENT.TRACK_COMPANY_CLICKED, { company: company })
        if (!user) {
            addToast('error', 'Please login to track', "")
            return
        };

        setLoading(true);
        try {
            if (isTracking) {
                await untrack({
                    userId: user._id,
                    targetType: "company",
                    targetId: company,
                });
                await unfollowCompany({
                    companyName: company,
                    userId: user._id
                })
            } else {
                await track({
                    userId: user._id,
                    targetType: "company",
                    targetId: company,
                });
                if (user) {

                    await followCompany({
                        companyName: company,
                        userId: user._id
                    })
                }
            }
        } finally {
            setLoading(false);
        }
    };

    if (posts === undefined) {
        return <CircularLoader />;
    }
    return (
        <div className="max-w-6xl mx-auto lg:py-10 py-4 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-blue-600">
                    Posts about {company}
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
            {posts.length === 0 && (
                <p className="text-slate-500">
                    No posts found for this company.
                </p>
            )}

            {/* Posts */}
            <div className="space-y-6">
                {posts.map((post) => (
                    <ArticleCard key={post._id} post={post} />
                ))}
            </div>
        </div>
    );
}
