"use client";

import React, { useState } from "react";
import { useUser } from "@/context/userContext";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/context/toastContext";

export default function LinkSubmissionForm() {
    const { user, isLoading } = useUser();
    const submitLink = useMutation(api.functions.usersLink.submitLink);
    const userId = user?._id;

    const [url, setUrl] = useState("");
    const [email, setEmail] = useState(user?.email);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState("");

    const { addToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);
            await submitLink({ url, email, notes, userId });
            setUrl("");
            setNotes("");
            addToast('success', 'Link submitted successfully', "");
        } finally {
            setLoading(false);
        }
    };

    if (isLoading) return null;

    return (
        <div className="max-w-2xl my-4 mx-auto px-4">
            <div className="rounded-3xl border border-gray-200 bg-gradient-to-b from-white to-gray-50/50 px-8 py-2 shadow-xl shadow-gray-200/50 backdrop-blur-sm">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4">
                        <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit a Site to Track</h2>
                    <p className="text-gray-600">
                        Share blogs, research sites, you want us to monitor for you.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* URL Input */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Website URL <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </div>
                            <input
                                type="url"
                                required
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onFocus={() => setFocusedField("url")}
                                onBlur={() => setFocusedField("")}
                                className={`w-full rounded-xl border ${focusedField === "url" ? "border-blue-500 ring-4 ring-blue-50" : "border-gray-200"
                                    } bg-white pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-400 transition-all focus:outline-none`}
                            />
                        </div>
                    </div>

                    {/* Category Input */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                            <input
                                type="email"
                                placeholder="e.g., Tech, Science, News"
                                value={user?.email}
                                required
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocusedField("category")}
                                onBlur={() => setFocusedField("")}
                                className={`w-full rounded-xl border ${focusedField === "category" ? "border-blue-500 ring-4 ring-blue-50" : "border-gray-200"
                                    } bg-white pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-400 transition-all focus:outline-none`}
                            />
                        </div>
                    </div>

                    {/* Notes Textarea */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Why should we track this?
                            <span className="text-gray-400 font-normal ml-1">(optional)</span>
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-4 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <textarea
                                placeholder="Tell us what makes this site valuable..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                onFocus={() => setFocusedField("notes")}
                                onBlur={() => setFocusedField("")}
                                rows={4}
                                className={`w-full rounded-xl border ${focusedField === "notes" ? "border-blue-500 ring-4 ring-blue-50" : "border-gray-200"
                                    } bg-white pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-400 transition-all focus:outline-none resize-none`}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 font-semibold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                <span>Submit Link</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}