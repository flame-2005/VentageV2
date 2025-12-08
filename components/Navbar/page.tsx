import { Search, LogOut, X } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { createClient, User, Session, AuthError } from '@supabase/supabase-js';
import { useSearch } from '@/context/searchContext';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';
import { GoogleLogo } from '@/constants/assets/googleLogo.svg';

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
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { searchTerm, inputValue, setInputValue, applySearch, clearSearch } = useSearch();

  // Get company suggestions based on input
  const suggestions = useQuery(
    api.functions.substackBlogs.getCompanySuggestions,
    inputValue.length >= 1 ? { searchTerm: inputValue } : "skip"
  );

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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(e.target.value.length >= 1);
  };

  const handleSuggestionClick = (companyName: string) => {
    setInputValue(companyName);
    applySearch(companyName);
    setShowSuggestions(false);
  };

  const handleClearSearch = (): void => {
    clearSearch();
    setShowSuggestions(false);
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
    <header className="bg-white/80 backdrop-blur-xl pt-8 border-slate-200 sticky top-0 z-10 shadow-sm pb-12">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          {/* Spacer for mobile, invisible element to maintain layout */}
          <div className="w-10 md:w-0"></div>

          {/* Centered Logo */}
          <Link href={'/home'} className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent flex mx-auto md:mx-0">
            <span className="text-black">
              The Vant
            </span>
            <span className="text-blue-600">
              Edge
            </span>
          </Link>

          {/* Auth Section */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center hover:bg-blue-700 transition-colors overflow-hidden"
                >
                  {getUserAvatar() ? (
                    <img src={getUserAvatar()} alt="User avatar" className="w-full h-full object-cover" />
                  ) : (
                    getUserInitial()
                  )}
                </button>

                {/* User Dropdown */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-200">
                      <p className="font-semibold text-slate-900">{getUserFullName()}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={signOut}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all shadow-sm font-medium text-slate-700"
              >
               <GoogleLogo />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 z-10" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by Company Name"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={() => inputValue.length >= 1 && setShowSuggestions(true)}
            className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
          {(inputValue || searchTerm) && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 overflow-y-auto z-50"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.companyName)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0 flex items-center justify-between group"
                >
                  <span className="font-medium text-slate-900 group-hover:text-blue-600">
                    {suggestion.companyName}
                  </span>
                  {suggestion.nseCode && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded group-hover:bg-blue-100 group-hover:text-blue-600">
                      {suggestion.nseCode}
                    </span>
                  )}
                </button>
              ))}

              {/* Search everywhere option */}
              <button
                onClick={() => {
                  applySearch();
                  setShowSuggestions(false);
                }}
                className="w-full px-4 py-3 text-left text-blue-600 hover:bg-blue-50 transition-colors font-medium border-t-2 border-blue-100"
              >
                Search everywhere: {inputValue}
              </button>
            </div>
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