// context/UserContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Id } from '@/convex/_generated/dataModel';
import { user } from '@/constants/user';
import { useRouter } from 'next/navigation';



interface UserContextType {
  supabaseUser: SupabaseUser | null;
  user: user | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const createOrUpdateUser = useMutation(api.functions.users.createOrUpdateUser);

  const router = useRouter()

  // Query Convex user data based on supabaseUser id
  const user = useQuery(
    api.functions.users.getUserByUserId,
    supabaseUser ? { userId: supabaseUser.id } : "skip"
  ) as user | null;

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSupabaseUser(session?.user ?? null);

        // Sync with Convex if user exists
        if (session?.user) {
          await syncUserWithConvex(session.user);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSupabaseUser(session?.user ?? null);

        if (session?.user) {
          await syncUserWithConvex(session.user);
        }

        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const syncUserWithConvex = async (user: SupabaseUser) => {
    try {
      await createOrUpdateUser({
        userId: user.id,
        email: user.email!,
        username: user.user_metadata?.username,
        fullName: user.user_metadata?.full_name || user.user_metadata?.name,
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      });
    } catch (error) {
      console.error('Error syncing user with Convex:', error);
    }
  };

  const signOut = async () => {
    try {
      // 🔥 Kill session everywhere
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        console.error("[LOGOUT] Supabase error", error);
      }

    } catch (err) {
      console.error("[LOGOUT] Exception", err);
    } finally {
      // ✅ ALWAYS clear local state (even if Supabase fails)
      setSupabaseUser(null);
      // 🧹 Safe browser cleanup
      if (typeof window !== "undefined") {
        sessionStorage.clear();
      }
      window.location.reload();
    }
  };



  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSupabaseUser(session?.user ?? null);

      if (session?.user) {
        await syncUserWithConvex(session.user);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: UserContextType = {
    supabaseUser,
    user,
    isLoading,
    signOut,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};