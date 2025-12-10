import { Doc, Id } from '@/convex/_generated/dataModel'
import { Calendar, Heart, MousePointerClick, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import Dropdown from './Dropdown/page'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/toastContext';
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useUser } from '@/context/userContext'


type ArticleCardProps = {
    post: Doc<'posts'>
}

const ArticleCard = ({ post }: ArticleCardProps) => {

    const { user } = useUser();

    const [isLiked, setIsLiked] = useState(post.usersLiked?.includes(user?._id as Id<"users">));
    const [likeCount, setLikeCount] = useState(post.usersLiked?.length || 0);
    const [shareCount, setShareCount] = useState(post.shareCount || 0);
    const [clickedCount, setClickedCount] = useState(post.clickedCount || 0);

    const companyNames = post.companyName && post.companyName !== 'null' && post.companyName !== undefined
        ? post.companyName.split(',').map(name => name.trim()).filter(Boolean)
        : []
    const isFullCaps = (name: string) => /^[A-Z0-9&().,\-\/\s]+$/.test(name.trim());
    const incrementClickCount = useMutation(api.functions.substackBlogs.incrementClickCount);
    const fullCapsCompanies = (() => {
        const filtered = companyNames.filter(isFullCaps);
        return filtered.length > 0
            ? filtered
            : (post.companyDetails?.map((c) => c.company_name) || []);
    })();

    const { addToast } = useToast();
    const firstCompany = fullCapsCompanies[0];
    const hasMultipleCompanies = fullCapsCompanies.length > 1;

    const router = useRouter();

    const handlePostClick = async () => {
        setClickedCount(clickedCount + 1)
        try {
            await incrementClickCount({ postId: post._id });
        } catch (error) {
            console.error("Failed to update click count:", error);
        }
    };

    const likeMutation = useMutation(api.functions.users.likePost);
    const shareMutation = useMutation(api.functions.users.sharePost);

    const likePost = async () => {
        if (!user) {
            addToast('error', 'Login Required', 'Please log in to like posts.');
            return;
        }
        setIsLiked(!isLiked);
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
        await likeMutation({
            postId: post._id,
            userId: user?._id as Id<"users">,
        });
    };

    const sharePost = async () => {
        setShareCount(shareCount + 1);
        await shareMutation({
            postId: post._id,
            userId: user?._id || undefined ,
        });
    };

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
                            src={post.image || post.imageUrl}
                            alt={post.companyName || 'Company logo'}
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-3 md:p-6">
                    <div className='flex justify-between'>

                        <a
                            onClick={() => handlePostClick()}
                            href={post.link}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <h3 className="text-sm md:text-xl font-bold text-slate-900 mb-1.5 md:mb-3 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {post.title}
                            </h3>
                        </a>
                        {post.tags && (
                            <div className="flex flex-wrap gap-1.5 h-fit">
                                {post.tags && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {post.tags && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {post.tags.map((tag, index) => {
                                                    const trimmedTag = tag.trim().toLowerCase();

                                                    // Map all tags to one of three sentiments and get display text
                                                    const getTagConfig = (tag: string) => {
                                                        // Bullish category
                                                        if (tag === 'bullish' || tag === 'positive') {
                                                            return {
                                                                style: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                                                display: 'Bullish'
                                                            };
                                                        }
                                                        // Bearish category
                                                        if (tag === 'bearish' || tag === 'negative') {
                                                            return {
                                                                style: 'bg-rose-100 text-rose-700 border-rose-200',
                                                                display: 'Bearish'
                                                            };
                                                        }
                                                        // Neutral category (includes neutral, cautious, speculative)
                                                        return {
                                                            style: 'bg-slate-100 text-slate-700 border-slate-200',
                                                            display: 'Neutral'
                                                        };
                                                    };

                                                    const tagConfig = getTagConfig(trimmedTag);

                                                    return (
                                                        <span
                                                            key={index}
                                                            className={`px-2 py-0.5 rounded-full text-xs md:text-sm font-medium border ${tagConfig.style}`}
                                                        >
                                                            {tagConfig.display}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

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
                                    year: "numeric",
                                })}
                            </span>

                        </div>


                        <div className='flex flex-wrap gap-2 md:gap-4 justify-start md:justify-center items-center'>

                            {/* {post.companyDetails && <div>
                                {post.companyDetails.map((c) => c.company_name)} Companies
                            </div>} */}
                            {/* Company Names Section */}
                            {fullCapsCompanies.length > 0 && firstCompany && (
                                <div className="relative">
                                    {hasMultipleCompanies ? (
                                        <Dropdown
                                            title={firstCompany}
                                            titleAction={() => {
                                                router.push(`/company/${encodeURIComponent(firstCompany)}`);
                                            }}
                                            options={fullCapsCompanies.slice(1).map(name => ({
                                                name,
                                                link: `/company/${encodeURIComponent(name)}`
                                            }))}
                                        />
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
                                onClick={() => likePost()}
                                className={`flex items-center gap-1 transition-colors ${isLiked ? "text-rose-500" : "hover:text-rose-500"
                                    }`}
                            >
                                <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                                {likeCount}
                            </button>
                            <button
                                onClick={async () => {
                                    sharePost();
                                    try {
                                        await navigator.clipboard.writeText(post.link);
                                        addToast('success', 'Link Copied!', 'The link has been copied to your clipboard.');
                                    } catch (error) {
                                        addToast('error', 'Copy Failed', 'Unable to copy link to clipboard.');
                                    }
                                }}
                                className={`flex items-center gap-1 transition-colors hover:text-rose-500`}
                            >
                                <Share2 className="w-4 h-4" />
                                {shareCount}
                            </button>
                            <div className="flex items-center gap-1"                        >
                                <MousePointerClick className="w- h-6" />
                                {clickedCount}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </article>
    )
}

export default ArticleCard