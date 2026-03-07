import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
    onSearch: (query: string) => void;
    isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim() && !isLoading) {
            onSearch(query.trim());
        }
    };

    return (
        <div className="w-full max-w-[760px] relative animate-[slideUp_0.8s_ease-out_0.4s_forwards] opacity-0 translate-y-5">
            <form
                onSubmit={handleSubmit}
                className="w-full bg-white/5 backdrop-blur-[40px] border border-white/10 rounded-3xl p-2 flex items-center shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-400 focus-within:bg-white/10 focus-within:border-purple-500/50 focus-within:shadow-[0_20px_50px_rgba(168,85,247,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] focus-within:-translate-y-0.5"
            >
                <div className="px-5 text-[var(--text-muted)]">
                    <Search size={24} />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none text-[var(--text-main)] text-xl py-4 outline-none placeholder:text-white/30"
                    placeholder="e.g. Find quotes with a melancholic rainy day vibe..."
                />
                <button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] border-none text-white px-8 py-4 rounded-2xl text-base font-semibold cursor-pointer transition-all duration-300 shadow-[0_8px_20px_rgba(168,85,247,0.3)] uppercase tracking-wide hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(236,72,153,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Searching...' : 'Search'}
                </button>
            </form>
        </div>
    );
};
