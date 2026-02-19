// app/share/[shareLink]/page.tsx
import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { isPost } from "@/helper/text";
import SharePageClient from "@/components/loadingDots";

let post: (Doc<"posts"> | Doc<"videos">) | null = null;

export async function generateMetadata({
  params
}: {
  params: Promise<{ shareLink: string }>
}) {

  const resolvedParams = await params;
  const shareLink = decodeURIComponent(resolvedParams.shareLink);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  try {
    post = await fetchQuery(api.functions.substackBlogs.getPostById, {
      id: shareLink as (Id<"posts"> | Id<"videos">),
    });
  } catch (e) {
    console.error("Metadata fetch failed:", e);
    return {
      title: "Post Not Found",
    };
  }

  if (!post) {
    return {
      title: "Post not found",
    };
  }

  let imageUrl

  if (isPost(post)) {
    imageUrl = post.image || post.imageUrl; // ✅ works
  } else {
    imageUrl = post.thumbnail!; // ✅ works
  }

  return {
    title: post.title ?? "Shared Post",
    description: post.summary ?? "Check out this post!",
    openGraph: {
      title: post.title ?? "Shared Post",
      description: post.summary ?? "Check out this post!",
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
      description: post.summary ?? "Check out this post!",
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: post.title ?? "Post image",
      }],
    },
  };
}

export default function SharePage() {
  return <SharePageClient shareLink={post!.link} />;
}