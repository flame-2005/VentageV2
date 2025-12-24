import { Search, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import Link from 'next/link';

const SearchBar = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState<string>()
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [debouncedInputValue, setDebouncedInputValue] = useState<string>('');

    const router = useRouter()

    const companySuggestions = useQuery(
        api.functions.substackBlogs.getCompanySuggestions,
        debouncedInputValue.length >= 2 ? { searchTerm: debouncedInputValue } : "skip"
    );

    const authorSuggestions = useQuery(
        api.functions.substackBlogs.getAuthorSuggestions,
        debouncedInputValue.length >= 2 ? { searchTerm: debouncedInputValue } : "skip"
    );

    // Debounce logic
    useEffect(() => {
        if (inputValue && inputValue.length > 2) {

            const timer = setTimeout(() => {
                setDebouncedInputValue(inputValue!);
            }, 300);
            return () => clearTimeout(timer);
        }

    }, [inputValue]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);

        const shouldShow = value.length >= 2;
        setShowSuggestions(shouldShow);

        if (shouldShow) {
            setActiveIndex(0);
        }
    };


    const closeSuggestions = () => {
        setShowSuggestions(false);
        setActiveIndex(0);
    };

    const clearSearch = () => {
        setInputValue("");
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter' && inputValue && inputValue?.length > 2) {
            router.push(`/search/${encodeURIComponent(inputValue)}`);
            closeSuggestions();
        }
    };

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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || flatSuggestions.length === 0) {
            if (e.key === "Enter" && inputValue && inputValue?.length > 2) {
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

    const handleClearSearch = (): void => {
        clearSearch();
        closeSuggestions();
        setDebouncedInputValue('');
    };

    const handleSearchEverywhere = () => {
        if (inputValue) {
            router.push(`/search/search-everywhere=${encodeURIComponent(inputValue)}`);
            closeSuggestions();
        }
    };

    const isDebouncing = inputValue && inputValue.length >= 2 && inputValue !== debouncedInputValue;
    const authorOffset = companySuggestions?.length || 0;

    return (
        <div>
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
                        if (inputValue && inputValue.length >= 2) {
                            setShowSuggestions(true);
                            setActiveIndex(0);
                        }
                    }}
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
                {(inputValue) && (
                    <button
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
                        aria-label="Clear search"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                {/* Suggestions Dropdown */}
                {showSuggestions && inputValue && inputValue.length >= 2 && (
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
        </div>
    )
}

export default SearchBar
