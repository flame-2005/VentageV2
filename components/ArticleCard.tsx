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
            <div className="flex">
                {/* Company block */}
                <div className="w-48 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-r border-slate-200">
                    <div className="text-center p-6">
                        <div className="text-3xl font-bold text-blue-600 mb-2">{post.companyName}</div>
                        <div className="text-sm font-semibold text-slate-600">{post.nseCode}</div>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                                {post.category}
                            </span>

                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                        {post.title}
                    </h3>

                    <p className="text-slate-600 leading-relaxed mb-4 line-clamp-2">{post.summary}</p>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            {/* <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {post.views ?? 0}
                            </span> */}

                            {post.author && <Link href={`/author/${encodeURIComponent(post.author)}`}>
                                {post.author}
                            </Link>}
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(post.pubDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                })}
                            </span>
                            {/* <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                                <Share2 className="w-4 h-4" />
                            </button> */}
                        </div>

                        <div className='flex space-x-4 justify-center items-center'>
                            <button
                                onClick={() => toggleLike(post._id)}
                                className={`flex items-center gap-1 transition-colors ${likedPosts.has(post._id) ? "text-rose-500" : "hover:text-rose-500"
                                    }`}
                            >
                                <Heart className={`w-4 h-4 ${likedPosts.has(post._id) ? "fill-current" : ""}`} />
                                {/* {post.likes! + (likedPosts.has(post._id) ? 1 : 0)} */}
                            </button>
                            {post.companyName && post.companyName !== 'null' && (
                                <Link
                                    href={`/company/${encodeURIComponent(post.companyName)}`}
                                    className="hover:text-blue-600 transition-colors font-medium text-slate-700"
                                >
                                    {post.companyName}
                                </Link>
                            )}
                            <a
                                href={post.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                            >
                                Read Full Analysis
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>

                    </div>
                </div>
            </div>
        </article>
    )
}

export default ArticleCard
