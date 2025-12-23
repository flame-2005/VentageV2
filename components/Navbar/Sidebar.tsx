import { GoogleLogo } from '@/constants/assets/googleLogo.svg';
import { useSearch } from '@/context/searchContext';
import { useUser } from '@/context/userContext';
import { api } from '@/convex/_generated/api';
import { signInWithGoogle } from '@/lib/users';
import { useQuery } from 'convex/react';
import { LogOut, Search, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react'

export interface SidebarInterface {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarInterface> = ({
  isOpen,
  setIsOpen
}) => {


  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [debouncedInputValue, setDebouncedInputValue] = useState<string>('');
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { user, isLoading, signOut } = useUser();
  const router = useRouter();

  const { searchTerm, inputValue, setInputValue, clearSearch } = useSearch();

  const [imgError, setImgError] = useState(false);

  const displayName = user ? (user.fullName || user.username) : "";
  const fallbackLetter = displayName ? displayName.charAt(0).toUpperCase() : "";

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInputValue(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Get company suggestions based on DEBOUNCED input
  const companySuggestions = useQuery(
    api.functions.substackBlogs.getCompanySuggestions,
    debouncedInputValue.length >= 2 ? { searchTerm: debouncedInputValue } : "skip"
  );

  const authorSuggestions = useQuery(
    api.functions.substackBlogs.getAuthorSuggestions,
    debouncedInputValue.length >= 2 ? { searchTerm: debouncedInputValue } : "skip"
  );

  const closeSuggestions = () => {
    setShowSuggestions(false);
    setActiveIndex(0);
  };

  // Handle clicks outside suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        closeSuggestions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const flatSuggestions = [
    ...(companySuggestions?.map(s => ({
      type: "company" as const,
      label: s.companyName,
      href: `/search/${encodeURIComponent(s.companyName)}`,
    })) || []),
    ...(authorSuggestions?.map(s => ({
      type: "author" as const,
      label: s.author,
      href: `/search/${encodeURIComponent(s.author)}`,
    })) || []),
  ];

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      router.push(`/search/${encodeURIComponent(inputValue)}`);
      closeSuggestions();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const shouldShow = value.length >= 2;
    setShowSuggestions(shouldShow);

    if (shouldShow) {
      setActiveIndex(0);
    }
  };

  const handleClearSearch = (): void => {
    clearSearch();
    closeSuggestions();
    setDebouncedInputValue('');
  };

  const handleSearchEverywhere = () => {
    router.push(`/search/search-everywhere=${encodeURIComponent(inputValue)}`);
    closeSuggestions();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || flatSuggestions.length === 0) {
      if (e.key === "Enter") {
        router.push(`/search/${encodeURIComponent(inputValue)}`);
        closeSuggestions();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < flatSuggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : flatSuggestions.length - 1
        );
        break;

      case "Enter":
        e.preventDefault();
        const selected = flatSuggestions[activeIndex];
        if (selected) {
          router.push(selected.href);
          setInputValue(selected.label);
          closeSuggestions();
        }
        break;

      case "Escape":
        closeSuggestions();
        break;
    }
  };

  const isDebouncing = inputValue.length >= 2 && inputValue !== debouncedInputValue;
  const authorOffset = companySuggestions?.length || 0;
  return (
    <>
      {/* Logo */}
      <Link href={'/home'} className="hidden lg:flex items-center gap-3 py-8">
        <div className="flex items-center gap-3 mb-4 ">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
            <Zap className="w-6 h-6 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-none italic">The VantEdge</h1>
            <span className="text-[10px] font-bold text-blue-600 tracking-[0.2em] uppercase">Intelligence OS</span>
          </div>
        </div>
      </Link>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search ticker or company..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.length >= 2) {
              setShowSuggestions(true);
              setActiveIndex(0);
            }
          }}
          className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
        />
        {(inputValue || searchTerm) && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && inputValue.length >= 2 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50"
          >
            {isDebouncing && (
              <div className="px-3 py-2 text-slate-500 text-sm">
                Searching...
              </div>
            )}

            {!isDebouncing && (companySuggestions || authorSuggestions) && (companySuggestions && companySuggestions?.length > 0 || authorSuggestions && authorSuggestions?.length > 0) ? (
              <>
                {companySuggestions && companySuggestions.length > 0 && (
                  <div className="border-b border-slate-200">
                    {companySuggestions.map((suggestion, index) => {
                      const globalIndex = index;
                      return (
                        <Link
                          key={`company-${index}`}
                          onClick={() => {
                            setInputValue(suggestion.companyName);
                            closeSuggestions();
                          }}
                          href={`/search/${encodeURIComponent(suggestion.companyName)}`}
                          className={`w-full px-3 py-2 text-left transition-colors border-b border-slate-100 last:border-b-0 flex items-center justify-between group ${activeIndex === globalIndex
                              ? "bg-blue-50 text-blue-600"
                              : "hover:bg-blue-50"
                            }`}
                        >
                          <span className="font-medium text-slate-900 group-hover:text-blue-600 text-sm">
                            {suggestion.companyName}
                          </span>
                          {suggestion.nseCode && (
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded group-hover:bg-blue-100 group-hover:text-blue-600">
                              {suggestion.nseCode}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}

                {authorSuggestions && authorSuggestions.length > 0 && (
                  <div className="border-b border-slate-200">
                    {authorSuggestions.map((suggestion, index) => {
                      const globalIndex = authorOffset + index;
                      return (
                        <Link
                          key={`author-${index}`}
                          onClick={() => {
                            setInputValue(suggestion.author);
                            closeSuggestions();
                          }}
                          href={`/search/${encodeURIComponent(suggestion.author)}`}
                          className={`w-full px-3 py-2 text-left transition-colors border-b border-slate-100 last:border-b-0 flex items-center justify-between group ${activeIndex === globalIndex
                              ? "bg-blue-50 text-blue-600"
                              : "hover:bg-blue-50"
                            }`}
                        >
                          <span className="font-medium text-slate-900 group-hover:text-blue-600 text-sm">
                            {suggestion.author}
                          </span>
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded group-hover:bg-blue-100 group-hover:text-blue-600">
                            Author
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}

            {inputValue && (
              <div>
                <button
                  onClick={handleSearchEverywhere}
                  className="w-full px-3 py-2.5 text-center bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center justify-center gap-2 rounded-b-lg text-sm"
                >
                  <Search className="w-4 h-4" />
                  Search everywhere for {inputValue}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Heading */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 leading-tight">
          Find <span className="text-blue-600">blogs</span> on
        </h2>
        <h2 className="text-3xl font-bold text-slate-900 leading-tight">
          companies you are
        </h2>
        <h2 className="text-3xl font-bold leading-tight">
          <span className="text-blue-600">tracking.</span>
        </h2>
      </div>

      {/* Submit Sources Button */}
      <button className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-auto text-sm"
        onClick={() => router.push("/track-link")}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        SUBMIT SOURCES
      </button>

      {/* User Section at Bottom */}
      <div className="mt-auto  border-t border-slate-200">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-3 bg-slate-200 rounded animate-pulse w-2/3" />
            </div>
          </div>
        ) : user ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 w-full hover:bg-slate-50 rounded-lg p-2 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center overflow-hidden flex-shrink-0">
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
              <div className="flex-1 text-left overflow-hidden">
                <p className="font-semibold text-slate-900 text-sm truncate">
                  {user.fullName || user.username}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </button>

            {showDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                <button
                  onClick={signOut}
                  className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 text-sm"
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
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all shadow-sm font-medium text-slate-700 w-full justify-center text-sm"
          >
            <GoogleLogo />
            Sign in
          </button>
        )}
      </div>

      {/* Version Footer */}
      <div className="mt-6 text-xs text-slate-400 text-center">
        THE VANTEDGE • V1.0
      </div>
    </>
  )
}

export default Sidebar
