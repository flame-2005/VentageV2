"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createOrUpdateUser = useMutation(
    api.functions.users.createOrUpdateUser
  );

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (!session?.user) {
          router.replace("/home");
          return;
        }

        await createOrUpdateUser({
          userId: session.user.id,
          email: session.user.email!,
          username: session.user.user_metadata?.username,
          fullName:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name,
          avatarUrl:
            session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture,
        });

        const next = searchParams.get("next") || "/";
        router.replace(next);
      } catch (err) {
        console.error("Auth callback error:", err);
        router.replace("/home");
      }
    };

    handleAuthCallback();
  }, [router, searchParams, createOrUpdateUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Completing sign in…</p>
      </div>
    </div>
  );
}
