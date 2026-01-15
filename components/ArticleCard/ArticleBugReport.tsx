import { useToast } from '@/context/toastContext';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react';
import React, { useState } from 'react'

type ArticleBugReportProps = {
    showReportModal: boolean;
    setShowReportModal: (value: boolean) => void;
    post: Doc<'posts'>;
    firstCompany: string | null;
    reportEmail: string;
    setReportEmail: (value: string) => void;
}

export const ArticleBugReporter = ({ showReportModal, setShowReportModal, post, reportEmail, setReportEmail, firstCompany }: ArticleBugReportProps) => {

    const [reportDescription, setReportDescription] = useState('')

    const { addToast } = useToast()

    const submitBugReport = useMutation(api.functions.bugs.submitBugReport)

    const handleReportSubmit = async () => {
        if (!reportEmail.trim()) {
            addToast('error', 'Email Required', 'Please provide your email address.')
            return
        }
        if (!reportDescription.trim()) {
            addToast('error', 'Description Required', 'Please describe the tagging issue.')
            return
        }

        try {
            await submitBugReport({
                email: reportEmail,
                pageLink: post.link || window.location.href,
                bugDescription: `Wrong Tagging Report for "${post.title}"\n\nCurrent Tags: ${post.tags?.join(', ') || 'None'}\n\nCompany: ${firstCompany || 'N/A'}\n\nIssue: ${reportDescription}`,
            })
            addToast('success', 'Report Submitted', 'Thank you for helping us improve our tagging!')
            setShowReportModal(false)
            setReportDescription('')
        } catch (error) {
            console.error('Failed to submit report:', error)
            addToast('error', 'Submission Failed', 'Unable to submit report. Please try again.')
        }
    }

    const getToneStyles = (tag: string) => {
        const trimmedTag = tag?.trim().toLowerCase() || ''
        if (trimmedTag === 'bullish' || trimmedTag === 'positive') {
            return 'bg-emerald-50 text-emerald-700 border-emerald-100'
        }
        if (trimmedTag === 'bearish' || trimmedTag === 'negative') {
            return 'bg-red-50 text-red-700 border-red-100'
        }
        return 'bg-slate-50 text-slate-700 border-slate-100'
    }


    const getToneDisplay = (tag: string) => {
        const trimmedTag = tag?.trim().toLowerCase() || ''
        if (trimmedTag === 'bullish' || trimmedTag === 'positive') return 'BULLISH'
        if (trimmedTag === 'bearish' || trimmedTag === 'negative') return 'BEARISH'
        return 'NEUTRAL'
    }


    return (
        <div>
            <AnimatePresence>
                {showReportModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 h-screen"
                        onClick={() => setShowReportModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900">Report Wrong Tagging</h3>
                                <button
                                    onClick={() => setShowReportModal(false)}
                                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-600 mb-1">Article:</p>
                                <p className="text-sm font-semibold text-slate-900 line-clamp-2">{post.title}</p>
                                <div className="flex gap-2 mt-2">
                                    {post.tags && post.tags[0] && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getToneStyles(post.tags[0])}`}>
                                            {getToneDisplay(post.tags[0])}
                                        </span>
                                    )}
                                    {post.companyName && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 border border-blue-100 rounded uppercase">
                                            {post.companyName}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Your Email
                                    </label>
                                    <input
                                        type="email"
                                        value={reportEmail}
                                        onChange={(e) => setReportEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Describe the Issue
                                    </label>
                                    <textarea
                                        value={reportDescription}
                                        onChange={(e) => setReportDescription(e.target.value)}
                                        placeholder="E.g., The sentiment should be bearish, not bullish..."
                                        rows={4}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowReportModal(false)}
                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleReportSubmit}
                                        className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                                    >
                                        Submit Report
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
