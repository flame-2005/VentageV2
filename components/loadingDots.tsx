// app/share/[shareLink]/SharePageClient.tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";

type shareLinkParams = {
  shareLink: string;
};

export const SharePageClient: React.FC<shareLinkParams> = ({ shareLink }) =>  {
  const router = useRouter(); 
  useEffect(() => {
    router.replace(shareLink);
  }, [shareLink, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="flex gap-2 justify-center mb-6">
          <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="text-lg font-medium text-gray-700">
          Redirecting...
        </p>
      </div>
    </div>
  );
}