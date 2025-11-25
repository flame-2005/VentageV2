import { Doc, Id } from '@/convex/_generated/dataModel'
import { Calendar, ChevronDown, ExternalLink, Eye, Heart, Share2 } from 'lucide-react'
import Link from 'next/link'
import React, { useState } from 'react'


type ArticleCardProps = {
    post: Doc<'posts'>
    likedPosts: Set<string>
    toggleLike: (postId: Id<"posts">) => void;
}

const ArticleCard = ({ post, likedPosts, toggleLike }: ArticleCardProps) => {
    const [showAllCompanies, setShowAllCompanies] = useState(false)

    const companyNames = post.companyName && post.companyName !== 'null' 
        ? post.companyName.split(',').map(name => name.trim()).filter(Boolean)
        : []
    
    const hasMultipleCompanies = companyNames.length > 1
    const firstCompany = companyNames[0]
    
    return (
        <article
            key={post._id}
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 group"
        >
            <div className="flex flex-row">
                {/* Company block - Hidden on mobile, fixed height with object-fit */}
                <div className="flex w-24 md:w-48 bg-gradient-to-br from-blue-50 to-indigo-50 items-center justify-center border-r border-slate-200">
                    <div className="text-center w-full h-32 md:h-40 flex items-center justify-center">
                        <img 
                            src={post.image} 
                            alt={post.companyName || 'Company logo'}
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-3 md:p-6">
                    <a
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <h3 className="text-sm md:text-xl font-bold text-slate-900 mb-1.5 md:mb-3 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {post.title}
                        </h3>
                    </a>

                    <p className="text-xs md:text-base text-slate-600 leading-snug mb-2 md:mb-4 line-clamp-2 md:line-clamp-3">
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
                            {/* Company Names Section */}
                            {companyNames.length > 0 && (
                                <div className="relative">
                                    {hasMultipleCompanies ? (
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowAllCompanies(!showAllCompanies)}
                                                className="flex items-center gap-1 hover:text-blue-600 transition-colors font-medium text-blue-900 text-xs md:text-sm"
                                            >
                                                <Link
                                                    href={`/company/${encodeURIComponent(firstCompany)}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="hover:text-blue-600"
                                                >
                                                    {firstCompany}
                                                </Link>
                                                <span className="text-xs text-slate-500">
                                                    +{companyNames.length - 1}
                                                </span>
                                                <ChevronDown className={`w-3 h-3 transition-transform ${showAllCompanies ? 'rotate-180' : ''}`} />
                                            </button>
                                            
                                            {showAllCompanies && (
                                                <div className="absolute max-h-32 overflow-auto top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px] py-1">
                                                    {companyNames.map((company, idx) => (
                                                        <Link
                                                            key={idx}
                                                            href={`/company/${encodeURIComponent(company)}`}
                                                            className="block px-4 py-2 text-xs md:text-sm text-blue-900 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                            onClick={() => setShowAllCompanies(false)}
                                                        >
                                                            {company}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <Link
                                            href={`/company/${encodeURIComponent(firstCompany)}`}
                                            className="hover:text-blue-600 transition-colors font-medium text-blue-900 text-xs md:text-sm"
                                        >
                                            {firstCompany}
                                        </Link>
                                    )}
                                </div>
                            )}
                            
                            <button
                                onClick={() => toggleLike(post._id)}
                                className={`flex items-center gap-1 transition-colors ${likedPosts.has(post._id) ? "text-rose-500" : "hover:text-rose-500"
                                    }`}
                            >
                                Likes <Heart className={`w-4 h-4 ${likedPosts.has(post._id) ? "fill-current" : ""}`} />
                            </button>
                            <button
                                onClick={() => toggleLike(post._id)}
                                className={`flex items-center gap-1 transition-colors ${likedPosts.has(post._id) ? "text-rose-500" : "hover:text-rose-500"
                                    }`}
                            >
                                Shares <Share2 className={`w-4 h-4 ${likedPosts.has(post._id) ? "fill-current" : ""}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    )
}

export default ArticleCard