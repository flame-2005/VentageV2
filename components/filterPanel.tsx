import React from "react";
import { Calendar, TrendingUp, X } from "lucide-react";

interface FilterPanelProps {
    showFilters: boolean;
    sortBy: string;
    setSortBy: (value: string) => void;
    selectedCategory: string;
    setSelectedCategory: (value: string) => void;
    selectedSentiment: string;
    setSelectedSentiment: (value: string) => void;
    categories:( string|undefined)[];
    sentiments: string[];
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    activeFiltersCount: number;
    clearFilters: () => void;
}

export default function FilterPanel({
    showFilters,
    sortBy,
    setSortBy,
    selectedCategory,
    setSelectedCategory,
    selectedSentiment,
    setSelectedSentiment,
    categories,
    sentiments,
    searchTerm,
    setSearchTerm,
    activeFiltersCount,
    clearFilters,
}: FilterPanelProps) {
    if (!showFilters) return null;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sort */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Sort By
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSortBy("date")}
                            className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                                sortBy === "date"
                                    ? "bg-blue-500 text-white shadow-md"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Date
                        </button>
                        <button
                            onClick={() => setSortBy("popularity")}
                            className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                                sortBy === "popularity"
                                    ? "bg-blue-500 text-white shadow-md"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            <TrendingUp className="w-4 h-4 inline mr-2" />
                            Popular
                        </button>
                    </div>
                </div>

                {/* Category Filter */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Category
                    </label>
                    {categories && (<select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat === "all" ? "All Categories" : cat}
                            </option>
                        ))}
                    </select>)}
                </div>

                {/* Sentiment Filter */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Sentiment
                    </label>
                    <select
                        value={selectedSentiment}
                        onChange={(e) => setSelectedSentiment(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {sentiments.map((sent) => (
                            <option key={sent} value={sent}>
                                {sent === "all" ? "All Sentiments" : sent}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 flex-wrap">
                    <span className="text-sm font-semibold text-slate-600">
                        Active filters:
                    </span>
                    
                    {searchTerm && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                            Search: {searchTerm}
                            <X
                                className="w-3 h-3 cursor-pointer hover:text-blue-900"
                                onClick={() => setSearchTerm("")}
                            />
                        </span>
                    )}
                    
                    {selectedCategory !== "all" && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2">
                            {selectedCategory}
                            <X
                                className="w-3 h-3 cursor-pointer hover:text-purple-900"
                                onClick={() => setSelectedCategory("all")}
                            />
                        </span>
                    )}
                    
                    {selectedSentiment !== "all" && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm flex items-center gap-2">
                            {selectedSentiment}
                            <X
                                className="w-3 h-3 cursor-pointer hover:text-emerald-900"
                                onClick={() => setSelectedSentiment("all")}
                            />
                        </span>
                    )}
                    
                    <button
                        onClick={clearFilters}
                        className="ml-auto text-sm text-slate-600 hover:text-slate-900 underline"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}