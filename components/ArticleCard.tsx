import { Doc, Id } from '@/convex/_generated/dataModel'
import { Calendar, ExternalLink, Eye, Heart, Share2 } from 'lucide-react'
import Link from 'next/link'
import React from 'react'


type ArticleCardProps = {
    post: Doc<'posts'>
    likedPosts: Set<string>
    toggleLike: (postId: Id<"posts">) => void;
}

const ArticleCard = ({ post, likedPosts, toggleLike }: ArticleCardProps) => {
    return (
        <article
            key={post._id}
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 group"
        >
            <div className="flex flex-row">
                {/* Company block - Hidden on mobile */}
                <div className="flex w-24 md:w-48 bg-gradient-to-br from-blue-50 to-indigo-50 items-center justify-center border-r border-slate-200">
                    <div className="text-center p-2 md:p-6 w-full">
                        <div className="text-base md:text-3xl font-bold text-blue-600 mb-0.5 md:mb-2 overflow-hidden md:text-clip break-words px-1"

                        >{post.companyName}</div>
                        <div className="text-xs md:text-sm font-semibold text-slate-600">{post.nseCode}</div>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-3 md:p-6">


                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                            <span className="px-2 md:px-3 py-0.5 md:py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                                {post.category}
                            </span>
                        </div>
                    </div>

                    <h3 className="text-sm md:text-xl font-bold text-slate-900 mb-1.5 md:mb-3 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {post.title}
                    </h3>

                    <p className="text-xs md:text-base text-slate-600 leading-snug mb-2 md:mb-4 line-clamp-2">
                        {post.summary}
                    </p>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                        <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-slate-500 flex-wrap">
                            {post.author && post.author !== 'null' && (
                                <Link
                                    href={`/author/${encodeURIComponent(post.author)}`}
                                    className="hover:text-blue-600 transition-colors font-medium text-slate-700"
                                >
                                    {post.author}
                                </Link>
                            )}
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(post.pubDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                })}
                            </span>
                        </div>

                        <div className='flex flex-wrap gap-2 md:gap-4 justify-start md:justify-center items-center'>
                            <button
                                onClick={() => toggleLike(post._id)}
                                className={`flex items-center gap-1 transition-colors ${likedPosts.has(post._id) ? "text-rose-500" : "hover:text-rose-500"
                                    }`}
                            >
                                <Heart className={`w-4 h-4 ${likedPosts.has(post._id) ? "fill-current" : ""}`} />
                            </button>

                            {post.companyName && post.companyName !== 'null' && (
                                <Link
                                    href={`/company/${encodeURIComponent(post.companyName)}`}
                                    className="hover:text-blue-600 transition-colors font-medium text-slate-700 text-xs md:text-sm"
                                >
                                    {post.companyName}
                                </Link>
                            )}

                            <a
                                href={post.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2.5 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-xs md:text-sm"
                            >
                                <span className="hidden sm:inline">Read Full Analysis</span>
                                <span className="sm:hidden">Read</span>
                                <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    )
}

export default ArticleCard