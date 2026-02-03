import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Id } from "@/convex/_generated/dataModel";

export async function generateMetadata({ params }: { params: { shareLink: string } }) {
  const shareLink = decodeURIComponent(params.shareLink);

  // Base URL MUST be static, not window.origin
  const baseUrl = "https://ventage-v2-git-bugs-fixing-flame2005s-projects.vercel.app";

  // --- Fetch post from Convex ---
  let post;
  try {
    post = await fetchQuery(api.functions.substackBlogs.getPostById, {
      id: shareLink as Id<"posts">,
    });
  } catch (e) {
    console.error("Metadata Convex fetch failed:", e);
    return {
      title: "Post Not Found",
      openGraph: {
        title: "Post Not Found",
        description: "Could not load metadata",
      },
    };
  }

  if (!post) {
    return {
      title: "Post not found",
      openGraph: {
        title: "Post not found",
        description: "This shared post does not exist",
      },
    };
  }

  return {
    title: post.title ?? "Shared Post",
    description: post.summary ?? "Check out this post!",

    openGraph: {
      title: post.title,
      description: post.summary ?? "Check out this post!",
      url: `${baseUrl}/share/${shareLink}`,
      type: "article",
      images: [
        {
          url: post.image, // MUST be HTTPS public
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description ?? "",
      images: [post.image],
    },
  };
}
