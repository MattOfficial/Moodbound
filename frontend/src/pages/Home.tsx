import React, { useState, useEffect } from 'react';
import { BackgroundEffect } from '../components/BackgroundEffect';
import { Navbar } from '../components/Navbar';
import { SearchBar } from '../components/SearchBar';
import { searchVibes, type SearchResponse, getSystemStatus, type SystemStatusResponse } from '../api/client';
import { BookOpen } from 'lucide-react';

export const Home: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SearchResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);

    useEffect(() => {
        getSystemStatus().then(setSystemStatus).catch(console.error);
    }, []);

    const handleSearch = async (query: string) => {
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await searchVibes(query);
            setResult(data);
        } catch (err: any) {
            console.error("Search failed:", err);
            setError(err.message || 'An error occurred during search.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col font-sans text-white overflow-x-hidden">
            <BackgroundEffect />

            <Navbar />

            <main className="relative z-10 flex-1 flex flex-col items-center pt-20 px-8 text-center max-w-7xl mx-auto w-full">
                {/* Hero Section */}
                <div className={`transition-all duration-700 ease-out flex flex-col items-center ${result ? 'scale-90 -translate-y-10 opacity-60' : 'scale-100 translate-y-0 opacity-100'}`}>
                    <h1 className="text-[clamp(3rem,5vw,4.5rem)] font-extrabold leading-[1.1] mb-6 tracking-tight">
                        What vibe are we <br />
                        <span className="inline-block bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-500 bg-[length:200%_auto] text-transparent bg-clip-text animate-[shine_4s_linear_infinite]">
                            feeling today?
                        </span>
                    </h1>
                    <p className="text-xl text-[var(--text-muted)] max-w-2xl mb-12">
                        Your AI assistant is ready. Describe a mood, drop a character name, or ask a question about your entire library.
                    </p>
                </div>

                <SearchBar onSearch={handleSearch} isLoading={isLoading} />

                {/* Suggestions when empty */}
                {!result && !isLoading && !error && (
                    <div className="mt-10 flex gap-3 flex-wrap justify-center animate-[slideUp_0.8s_ease-out_0.6s_forwards] opacity-0 translate-y-5">
                        {['⛈️ Dark & Stormy', '⚔️ Betrayal plots', '🌸 Serene moments', '🗺️ World building'].map(suggestion => (
                            <button key={suggestion} onClick={() => handleSearch(suggestion.substring(3))} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[var(--text-muted)] hover:text-white hover:bg-white/10 hover:border-purple-500/30 transition-all backdrop-blur-md hover:-translate-y-0.5">
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="mt-16 flex flex-col items-center opacity-70 animate-pulse">
                        <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin mb-4" />
                        <p className="text-purple-300 font-medium tracking-wider uppercase text-sm">Synthesizing vibes from Vector Space...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="mt-16 p-6 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-lg max-w-2xl w-full mx-auto">
                        <p className="text-red-400 font-semibold">{error}</p>
                    </div>
                )}

                {/* Results Stream */}
                {result && !isLoading && (
                    <div className="mt-12 w-full max-w-4xl text-left animate-[slideUp_0.8s_ease-out_forwards]">
                        <div className="glass-card mb-8">
                            <h2 className="text-sm font-bold tracking-widest text-[var(--text-muted)] uppercase mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]" /> AI Synthesis
                            </h2>
                            <div className="prose prose-invert max-w-none text-lg leading-relaxed">
                                {result.answer.split('\n').map((para, i) => (
                                    <p key={i} className="mb-4 last:mb-0">{para}</p>
                                ))}
                            </div>
                        </div>

                        <h3 className="text-sm font-bold tracking-widest text-[var(--text-muted)] uppercase mb-4 ml-2">Source Excerpts</h3>
                        <div className="grid gap-4">
                            {result.sources.map((source, i) => (
                                <div key={i} className="glass-card bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2 text-purple-400">
                                            <BookOpen size={16} />
                                            <span className="font-semibold text-sm">{source.filename}</span>
                                        </div>
                                        <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded-md">
                                            Score: {source.score.toFixed(3)}
                                        </span>
                                    </div>
                                    <p className="text-white/70 text-sm leading-relaxed italic border-l-2 border-purple-500/30 pl-4 py-1">
                                        "{source.text}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Side Widgets */}
            <aside className="fixed left-10 bottom-10 flex flex-col gap-4 z-20 pointer-events-none hidden lg:flex">
                <div className="glass-card w-[280px] pointer-events-auto shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[0.85rem] uppercase tracking-widest text-[var(--text-muted)] font-semibold">System Status</span>
                        <div className={`inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-full border ${systemStatus?.status === 'Online' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${systemStatus?.status === 'Online' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse' : 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'}`} />
                            {systemStatus?.status || 'Connecting...'}
                        </div>
                    </div>
                    <div className="text-[0.85rem] text-[var(--text-muted)] flex flex-col gap-2">
                        <div className="flex justify-between">
                            <span>Agent Router</span>
                            <span className="text-white font-mono">{systemStatus?.agent_router || '...'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Vector DB</span>
                            <span className="text-white font-mono">{systemStatus?.vector_db || '...'}</span>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
};
