import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Id } from "@/convex/_generated/dataModel";

export async function generateMetadata({ params }: { params: { shareLink: string } }) {
  const shareLink = decodeURIComponent(params.shareLink);

  // Fetch post on server to generate OG tags
  const post = await fetchQuery(api.functions.substackBlogs.getPostById, {
    id: shareLink as Id<"posts">,
  });

  if (!post) {
    return {
      title: "Post not found",
      openGraph: {
        title: "Post not found",
      },
    };
  }

  return {
    title: post.title || "Shared Post",
    description: post.description || "Check out this post!",
    openGraph: {
      title: post.title,
      description: post.description,
      images: [{ url: post.image }],
      url: `https://5a390f14c90b.ngrok-free.app/${shareLink}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [post.image],
    },
  };
}
