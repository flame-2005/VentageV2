"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/context/toastContext";
import { Doc } from "@/convex/_generated/dataModel";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/userContext";
import { ALLOWED_EMAILS } from "@/constants/user";

export default function AddBlogPage() {
    const addBlogs = useMutation(api.functions.substackBlogs.addBlogs);
    const blogs = useQuery(api.functions.substackBlogs.getAllBlogs);

    const router = useRouter();
    const { user, isLoading } = useUser();


    const [url, setUrl] = useState("");
    const [source, setSource] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const { addToast } = useToast();

    useEffect(() => {
        if (isLoading) return;

        if (!user || !ALLOWED_EMAILS.includes(user.email)) {
            router.push("/home");
        }
    }, [user, isLoading, router]);


    function deriveBlogData(domain: string) {
        const hostname = domain
            .replace("https://", "")
            .replace("http://", "")
            .replace("www.", "")
            .split("/")[0];

        const name = hostname.split(".")[0];

        return {
            name,
            domain,
            feedUrl: domain,
        };
    }

    async function handleSubmit() {
        if (!blogs) return; // still loading

        setLoading(true);
        setMessage("");

        try {
            const { name, domain, feedUrl } = deriveBlogData(url.trim());

            // 🔍 Duplicate check
            const alreadyExists = blogs.some(
                (blog: Doc<"blogs">) =>
                    blog.domain === domain || blog.feedUrl === feedUrl
            );

            if (alreadyExists) {
                addToast(
                    "error",
                    "Blog already exists",
                    "This blog is already being tracked."
                );
                setLoading(false);
                return;
            }

            await addBlogs({
                name,
                domain,
                feedUrl,
                source: source.trim(),
            });

            addToast("success", "Blog added successfully!", "");
            setUrl("");
            setSource("");
        } catch (err) {
            console.error(err);
            addToast(
                "error",
                "Failed to add blog",
                "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }


    return (
        <div className="lg:min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Track a Blog
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Add a new blog to your reading list
                        </p>
                    </div>

                    {/* Form */}
                    <div className="space-y-5">
                        {/* URL Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Blog URL
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                                <input
                                    type="url"
                                    placeholder="https://example.substack.com"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Source Select */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Platform
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                </div>
                                <select
                                    value={source}
                                    onChange={(e) => setSource(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none appearance-none bg-white"
                                >
                                    <option value="">Select a platform</option>
                                    <option value="substack">Substack</option>
                                    <option value="medium">Medium</option>
                                    <option value="wordpress">WordPress</option>
                                    <option value="ghost">Blogspot</option>
                                    <option value="other">Other</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !url || !source}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-indigo-500/30"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Adding Blog...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Blog
                                </span>
                            )}
                        </button>

                        {/* Success/Error Message */}
                        {message && (
                            <div className={`p-4 rounded-xl flex items-center space-x-3 ${message === "success"
                                ? "bg-green-50 text-green-800 border border-green-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                                }`}>
                                {message === "success" ? (
                                    <>
                                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">Blog added successfully!</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">Failed to add blog. Please try again.</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6">
                    <p className="text-sm text-gray-500">
                        Track blogs from Substack, Medium, and more
                    </p>
                </div>
            </div>
        </div>
    );
}