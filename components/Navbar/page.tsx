import { Search, LogOut, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { createClient, User, Session, AuthError } from '@supabase/supabase-js';
import { useSearch } from '@/context/searchContext';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type UserMetadata = {
  avatar_url?: string;
  full_name?: string;
  email?: string;
};

const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const { searchTerm, inputValue, setInputValue, applySearch, clearSearch } = useSearch();

  useEffect(() => {
    // Check active session
    const checkSession = async (): Promise<void> => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      const authError = error as AuthError;
      console.error('Error signing in:', authError.message);
      alert('Failed to sign in with Google');
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setShowDropdown(false);
    } catch (error) {
      const authError = error as AuthError;
      console.error('Error signing out:', authError.message);
      alert('Failed to sign out');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      applySearch();
    }
  };

  const handleClearSearch = (): void => {
    clearSearch();
  };

  const getUserInitial = (): string => {
    const metadata = user?.user_metadata as UserMetadata | undefined;

    if (metadata?.full_name) {
      return metadata.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserAvatar = (): string | undefined => {
    const metadata = user?.user_metadata as UserMetadata | undefined;
    return metadata?.avatar_url;
  };

  const getUserFullName = (): string => {
    const metadata = user?.user_metadata as UserMetadata | undefined;
    return metadata?.full_name || 'User';
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            The VantEdge
          </h1>

          <div className="relative">
            {loading ? (
              <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
            ) : user ? (
              <>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label="User menu"
                >
                  {getUserAvatar() ? (
                    <img
                      src={getUserAvatar()}
                      alt="User avatar"
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {getUserInitial()}
                    </div>
                  )}
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900">
                        {getUserFullName()}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={signOut}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all shadow-sm font-medium text-slate-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by company, NSE code, or sentiment... (Press Enter to search)"
            value={inputValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
          {(inputValue || searchTerm) && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Active search indicator */}
        {searchTerm && (
          <div className="mt-2 text-sm text-slate-600">
            Searching for: <span className="font-semibold text-blue-600">{searchTerm}</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;