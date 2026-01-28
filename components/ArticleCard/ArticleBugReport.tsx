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
    const [selectedIssue, setSelectedIssue] = useState('')

    const { addToast } = useToast()

    const submitBugReport = useMutation(api.functions.bugs.submitBugReport)

    const handleReportSubmit = async () => {
        if (!reportEmail.trim()) {
            addToast('error', 'Email Required', 'Please provide your email address.')
            return
        }
        if (!selectedIssue) {
            addToast('error', 'Issue Required', 'Please select an issue type.')
            return
        }

        try {
            await submitBugReport({
                email: reportEmail,
                pageLink: post.link || window.location.href,
                bugDescription: `Wrong Tagging Report for "${post.title} \n\n Id - ${post._id}"\n\nCurrent Tags: ${post.tags?.join(', ') || 'None'}\n\nCompany: ${firstCompany || 'N/A'}\n\nIssue Type: ${selectedIssue}\n\nAdditional Details: ${reportDescription || 'None provided'}`,
            })
            addToast('success', 'Report Submitted', 'Thank you for helping us improve our tagging!')
            setShowReportModal(false)
            setReportDescription('')
            setSelectedIssue('')
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
                                <h3 className="text-lg font-bold text-slate-900">Feedback on Link</h3>
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
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Issue Type
                                    </label>
                                    <div className="space-y-2">
                                        {[
                                            { value: 'Blog quality is poor', label: 'Blog quality is poor' },
                                            { value: 'Wrong company tag', label: 'Wrong company tag' },
                                            { value: 'Link is broken / Domain expired', label: 'Link is broken / Domain expired' },
                                            { value: 'Others', label: 'Others' }
                                        ].map((option) => (
                                            <label
                                                key={option.value}
                                                className="flex items-center gap-2 cursor-pointer group"
                                            >
                                                <input
                                                    type="radio"
                                                    name="issueType"
                                                    value={option.value}
                                                    checked={selectedIssue === option.value}
                                                    onChange={(e) => setSelectedIssue(e.target.value)}
                                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-700 group-hover:text-slate-900">
                                                    {option.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Additional Details <span className="text-slate-400 font-normal">(Optional)</span>
                                    </label>
                                    <textarea
                                        value={reportDescription}
                                        onChange={(e) => setReportDescription(e.target.value)}
                                        placeholder="Add any additional information..."
                                        rows={4}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-none"
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