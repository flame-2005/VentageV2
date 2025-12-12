import { Search, LogOut, X } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { createClient, User, Session, AuthError } from '@supabase/supabase-js';
import { useSearch } from '@/context/searchContext';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';
import { GoogleLogo } from '@/constants/assets/googleLogo.svg';
import { signInWithGoogle } from '@/lib/users';
import { useUser } from '@/context/userContext';
import { useRouter } from 'next/navigation';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const Navbar = () => {
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [debouncedInputValue, setDebouncedInputValue] = useState<string>('');
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user, isLoading, signOut } = useUser();
  const router = useRouter();

  const { searchTerm, inputValue, setInputValue, clearSearch } = useSearch();

  const [imgError, setImgError] = useState(false);

  const displayName = user ? (user.fullName || user.username ) : "";
  const fallbackLetter = displayName ? displayName.charAt(0).toUpperCase() : "";

  // Debounce logic: Update debouncedInputValue after 300ms of no typing
  useEffect(() => {

    const timer = setTimeout(() => {
      setDebouncedInputValue(inputValue);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Get company suggestions based on DEBOUNCED input
  const suggestions = useQuery(
    api.functions.substackBlogs.getCompanySuggestions,
    debouncedInputValue.length >= 2 ? { searchTerm: debouncedInputValue } : "skip"
  );

  // Handle clicks outside suggestions dropdown
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      router.push(`/search/${encodeURIComponent(inputValue)}`);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Show suggestions immediately if there's input (loading state)
    // Actual suggestions will load after debounce
    setShowSuggestions(value.length >= 2);
  };

  const handleClearSearch = (): void => {
    clearSearch();
    setShowSuggestions(false);
    setDebouncedInputValue('');
  };

  // Show loading state while debouncing
  const isDebouncing = inputValue.length >= 2 && inputValue !== debouncedInputValue;

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
            {isLoading ? (
              <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center hover:bg-blue-700 transition-colors overflow-hidden"
                >
                  <div className="w-full h-full flex items-center justify-center bg-black text-white font-semibold">
                    {!imgError && user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="User avatar"
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      fallbackLetter
                    )}
                  </div>

                </button>

                {/* User Dropdown */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-200">
                      <p className="font-semibold text-slate-900">{user.fullName || user.username}</p>
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
            onFocus={() => inputValue.length >= 2 && setShowSuggestions(true)}
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
          {showSuggestions && inputValue.length >= 2 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 overflow-y-auto z-50"
            >
              {/* Loading State */}
              {isDebouncing && (
                <div className="px-4 py-3 text-slate-500 text-sm">
                  Searching...
                </div>
              )}

              {/* Show suggestions after debounce */}
              {!isDebouncing && suggestions && suggestions.length > 0 ? (
                suggestions.map((suggestion, index) => (
                  <Link
                    key={index}
                    onClick={() => {
                      setInputValue(suggestion.companyName);
                      setShowSuggestions(false);
                    }}
                    href={`/search/${encodeURIComponent(suggestion.companyName)}`}
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
                  </Link>
                ))
              ) : null}
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