"use client";

// pages/auth/callback.tsx (or app/auth/callback/page.tsx for Next.js App Router)
import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // or 'next/navigation' for App Router
import { supabase } from '@/lib/supabase';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function AuthCallback() {
  const router = useRouter();
  const createOrUpdateUser = useMutation(api.functions.users.createOrUpdateUser);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          // Store user in Convex database
          await createOrUpdateUser({
            userId: session.user.id,
            email: session.user.email!,
            username: session.user.user_metadata?.username,
            fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            avatarUrl: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
          });

          // Get the stored redirect path or default to home
          const redirectPath = sessionStorage.getItem('redirectAfterAuth') || '/';
          sessionStorage.removeItem('redirectAfterAuth');
          
          // Redirect back to original page
          router.push(redirectPath);
        } else {
          // No session found, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        alert('Failed to complete sign in');
        router.push('/login');
      }
    };

    handleAuthCallback();
  }, [router, createOrUpdateUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}