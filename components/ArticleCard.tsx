import { Doc, Id } from '@/convex/_generated/dataModel'
import { Calendar, Heart, MousePointerClick, Share2, User, ArrowRight, Building2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Dropdown from './Dropdown/page'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/toastContext'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useUser } from '@/context/userContext'

type ArticleCardProps = {
    post: Doc<'posts'>
    index?: number
}

const ArticleCard = ({ post, index = 0 }: ArticleCardProps) => {
    const { user } = useUser()

    const [isLiked, setIsLiked] = useState(post.usersLiked?.includes(user?._id as Id<"users">))
    const [likeCount, setLikeCount] = useState(post.usersLiked?.length || 0)
    const [shareCount, setShareCount] = useState(post.shareCount || 0)
    const [clickedCount, setClickedCount] = useState(post.clickedCount || 0)
    const [imageError, setImageError] = useState(false)

    const companyNames = post.companyName && post.companyName !== 'null' && post.companyName !== undefined
        ? post.companyName.split(',').map(name => name.trim()).filter(Boolean)
        : []

    const isFullCaps = (name: string) => /^[A-Z0-9&().,\-\/\s]+$/.test(name.trim())
    const incrementClickCount = useMutation(api.functions.substackBlogs.incrementClickCount)

    const fullCapsCompanies = (() => {
        const filtered = companyNames.filter(isFullCaps)
        return filtered.length > 0
            ? filtered
            : (post.companyDetails?.map((c) => c.company_name) || [])
    })()

    const { addToast } = useToast()
    const firstCompany = fullCapsCompanies[0]
    const hasMultipleCompanies = fullCapsCompanies.length > 1

    const router = useRouter()

    const handlePostClick = async () => {
        setClickedCount(clickedCount + 1)
        try {
            await incrementClickCount({ postId: post._id })
        } catch (error) {
            console.error("Failed to update click count:", error)
        }
    }

    const likeMutation = useMutation(api.functions.users.likePost)
    const shareMutation = useMutation(api.functions.users.sharePost)

    const likePost = async () => {
        if (!user) {
            addToast('error', 'Login Required', 'Please log in to like posts.')
            return
        }
        setIsLiked(!isLiked)
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
        await likeMutation({
            postId: post._id,
            userId: user?._id as Id<"users">,
        })
    }

    const sharePost = async () => {
        setShareCount(shareCount + 1)
        await shareMutation({
            postId: post._id,
            userId: user?._id || undefined,
        })
    }

    // Get tag configuration
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

    const mainTag = post.tags?.[0]

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-white rounded-2xl p-3 sm:p-4 hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-200 transition-all flex flex-col sm:flex-row gap-3 sm:gap-5 items-stretch"
        >
            {/* Image - Full width on mobile, compact on desktop */}
            <div className="flex-shrink-0 w-full sm:w-44">
                <div className="w-full h-48 sm:h-32 bg-slate-100 rounded-lg overflow-hidden">
                    {!imageError ? (
                        <img
                            src={post.image || post.imageUrl}
                            alt={post.companyName || "Company logo"}
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-slate-400">
                            {firstCompany || "N/A"}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
                {/* Top Meta Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Company Tag */}
                        {fullCapsCompanies.length > 0 && firstCompany && (
                            <div className="relative">
                                {hasMultipleCompanies ? (
                                    <Dropdown
                                        title={firstCompany}
                                        titleAction={() => {
                                            router.push(`/company/${encodeURIComponent(firstCompany)}`)
                                        }}
                                        options={fullCapsCompanies.slice(1).map(name => ({
                                            name,
                                            link: `/company/${encodeURIComponent(name)}`
                                        }))}
                                    />
                                ) : (
                                    <Link
                                        href={`/company/${encodeURIComponent(firstCompany)}`}
                                        className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-xs font-bold uppercase tracking-tight hover:bg-blue-100 transition-colors"
                                    >
                                        <Building2 className="w-2.5 h-2.5" />
                                        <span className="truncate max-w-[120px] sm:max-w-none">{firstCompany}</span>
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Sentiment Tag */}
                        {mainTag && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase whitespace-nowrap ${getToneStyles(mainTag)}`}>
                                {getToneDisplay(mainTag)}
                            </span>
                        )}
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] sm:text-xs font-medium">
                            {new Date(post.pubDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            }).toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Title & Summary */}
                <div>
                    <a
                        onClick={() => handlePostClick()}
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <h4 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 sm:line-clamp-1 mb-1 sm:mb-1 leading-tight">
                            {post.title}
                        </h4>
                    </a>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-3">
                        {post.summary}
                    </p>
                </div>

                {/* Footer Row */}
                <div className="flex flex-row items-center justify-between gap-3 sm:gap-0 pt-2 border-t border-slate-50">
                    {/* Author */}
                    {post.author && post.author !== 'null' && (
                        <Link
                            href={`/author/${encodeURIComponent(post.author)}`}
                            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                        >
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">
                                <User className="w-3 h-3 text-slate-500" />
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">{post.author}</span>
                        </Link>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 sm:gap-4 text-slate-500">
                        <button
                            onClick={() => likePost()}
                            className={`flex items-center gap-1 transition-colors cursor-pointer ${isLiked ? "text-rose-500" : "hover:text-rose-500"
                                }`}
                        >
                            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                            <span className="text-[10px] sm:text-xs font-bold">{likeCount}</span>
                        </button>

                        <button
                            onClick={async () => {
                                try {
                                    await sharePost()
                                    const shareUrl = `${window.location.origin}/share/${post._id}`
                                    await navigator.clipboard.writeText(shareUrl)
                                    addToast(
                                        "success",
                                        "Link Copied!",
                                        "The share link has been copied to your clipboard."
                                    )
                                } catch (error) {
                                    console.error(error)
                                    addToast(
                                        "error",
                                        "Copy Failed",
                                        "Unable to copy link to clipboard. Try again!"
                                    )
                                }
                            }}
                            className="flex items-center gap-1 hover:text-blue-500 transition-colors cursor-pointer"
                        >
                            <Share2 className="w-4 h-4" />
                            <span className="text-[10px] sm:text-xs font-bold">{shareCount}</span>
                        </button>

                        <div className="flex items-center gap-1">
                            <MousePointerClick className="w-4 h-4" />
                            <span className="text-[10px] sm:text-xs font-bold">{clickedCount}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.article>
    )
}

export default ArticleCard