// app/share/[shareLink]/page.tsx
import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import SharePageClient from "./SharePageClient";

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ shareLink: string }> 
}) {
  console.log("=== METADATA GENERATION START ===");
  
  const resolvedParams = await params;
  const shareLink = decodeURIComponent(resolvedParams.shareLink);
  
  console.log("ShareLink:", shareLink);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ventage-v2-git-bugs-fixing-flame2005s-projects.vercel.app";

  let post;
  try {
    post = await fetchQuery(api.functions.substackBlogs.getPostById, {
      id: shareLink as Id<"posts">,
    });
    console.log("Post fetched:", post?.title);
  } catch (e) {
    console.error("Metadata fetch failed:", e);
    return {
      title: "Post Not Found",
    };
  }

  if (!post) {
    console.log("Post not found");
    return {
      title: "Post not found",
    };
  }

  const imageUrl = post.image?.startsWith('http') 
    ? post.image 
    : `${baseUrl}${post.image}`;

  console.log("Image URL:", imageUrl);
  console.log("=== METADATA GENERATION END ===");

  return {
    title: post.title ?? "Shared Post",
    description: post.description ?? "Check out this post!",
    openGraph: {
      title: post.title ?? "Shared Post",
      description: post.description ?? "Check out this post!",
      url: `${baseUrl}/share/${shareLink}`,
      type: "article",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title ?? "Post image",
        }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title ?? "Shared Post",
      description: post.description ?? "Check out this post!",
      images: [imageUrl],
    },
  };
}

export default function SharePage() {
  return <SharePageClient />;
}