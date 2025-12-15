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

  const baseUrl = "https://www.soapbox.co.in";

  return {
    title: post.title || "Shared Post",
    description: post.description || "Check out this post!",
    openGraph: {
      title: post.title,
      description: post.description || "Check out this post!",
      images: [{ url: post.image }],
      url: `${baseUrl}/share/${shareLink}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description || "Check out this post!",
      images: [post.image],
    },
  };
}
