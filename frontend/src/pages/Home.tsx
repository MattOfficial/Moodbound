import React, { useState, useEffect } from 'react';
import { BackgroundEffect } from '../components/BackgroundEffect';
import { Navbar } from '../components/Navbar';
import { SearchBar } from '../components/SearchBar';
import { searchVibes, type SearchResponse, getSystemStatus, type SystemStatusResponse, getErrorMessage } from '../api/client';
import { BookOpen, Network, Sparkles, MoveRight } from 'lucide-react';

type VibeCategory = "Antigravity" | "Melancholic" | "Serene" | "Dark" | "Tense" | "Romantic" | "Epic" | "Mysterious" | "Happy" | "Neutral";

// Map vibes to Tailwind hex colors for inline CSS variable updates
const VIBE_HEX: Record<VibeCategory, string> = {
    Antigravity: '#3b82f6', // blue-500
    Neutral: '#a855f7',     // purple-500
    Melancholic: '#3b82f6', // blue-500
    Serene: '#14b8a6',      // teal-500
    Dark: '#991b1b',        // red-800
    Tense: '#dc2626',       // red-600
    Romantic: '#f43f5e',    // rose-500
    Epic: '#f59e0b',        // amber-500
    Mysterious: '#8b5cf6',  // violet-500
    Happy: '#eab308'        // yellow-500
};

export const Home: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SearchResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
    const [currentVibe, setCurrentVibe] = useState<VibeCategory>("Antigravity");

    useEffect(() => {
        getSystemStatus().then(setSystemStatus).catch(console.error);
    }, []);

    const handleSearch = async (query: string) => {
        setIsLoading(true);
        setError(null);
        setResult(null);
        setCurrentVibe("Neutral"); // Reset while searching

        try {
            const data = await searchVibes(query);
            setResult(data);
            if (data.vibe) {
                setCurrentVibe(data.vibe as VibeCategory);
            }
        } catch (error: unknown) {
            console.error("Search failed:", error);
            setError(getErrorMessage(error, 'An error occurred during search.'));
        } finally {
            setIsLoading(false);
        }
    };

    const activeHex = VIBE_HEX[currentVibe] || VIBE_HEX.Neutral;

    return (
        <div
            className="relative min-h-screen flex flex-col font-sans text-white overflow-x-hidden transition-colors duration-1000"
            style={{
                '--vibe-color': activeHex,
                '--vibe-shadow': `0 0 10px ${activeHex}`,
                backgroundColor: `color-mix(in srgb, ${activeHex} 12%, #010108)` // Global atmospheric tint
            } as React.CSSProperties}
        >
            <BackgroundEffect vibe={currentVibe} activeHex={activeHex} />

            <Navbar />

            <main className="relative z-10 flex-1 flex flex-col items-center pt-20 px-8 text-center max-w-7xl mx-auto w-full">
                {/* Hero Section */}
                <div className={`transition-all duration-700 ease-out flex flex-col items-center ${result ? 'scale-90 -translate-y-10 opacity-60' : 'scale-100 translate-y-0 opacity-100'}`}>
                    <h1 className="text-[clamp(3rem,5vw,4.5rem)] font-extrabold leading-tight mb-6 tracking-tight transition-colors duration-1000">
                        What vibe are we <br />
                        <span
                            className="inline-block bg-[length:200%_auto] text-transparent bg-clip-text animate-shine pb-4 px-2 transition-all duration-1000"
                            style={{ backgroundImage: `linear-gradient(to top right, ${activeHex}, #ec4899, #06b6d4)` }}
                        >
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
                    <div className="mt-10 flex gap-3 flex-wrap justify-center animate-slideUp" style={{ animationDelay: '0.6s' }}>
                        {['⛈️ Dark & Stormy', '⚔️ Betrayal plots', '🌸 Serene moments', '🗺️ World building'].map(suggestion => (
                            <button key={suggestion} onClick={() => handleSearch(suggestion.substring(3))} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-all backdrop-blur-md hover:-translate-y-0.5" style={{ borderColor: `color-mix(in srgb, ${activeHex} 30%, transparent)` }}>
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="mt-16 flex flex-col items-center opacity-70 animate-pulse">
                        <div className="w-12 h-12 rounded-full border-4 animate-spin mb-4 transition-colors duration-1000" style={{ borderColor: `color-mix(in srgb, ${activeHex} 30%, transparent)`, borderTopColor: activeHex }} />
                        <p className="font-medium tracking-wider uppercase text-sm transition-colors duration-1000" style={{ color: activeHex }}>Synthesizing vibes from Vector Space...</p>
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
                    <div className="mt-12 w-full max-w-4xl text-left animate-slideUp pb-24">
                        <div className="glass-card mb-8">
                            <h2 className="text-sm font-bold tracking-widest text-[var(--text-muted)] uppercase mb-4 flex items-center gap-2">
                                {result.engine === 'neo4j-graph' ? (
                                    <Network size={16} className="transition-colors duration-1000" style={{ color: activeHex, filter: `drop-shadow(0 0 5px ${activeHex})` }} />
                                ) : result.engine === 'qdrant-hybrid' ? (
                                    <Sparkles size={16} className="transition-colors duration-1000" style={{ color: activeHex, filter: `drop-shadow(0 0 5px ${activeHex})` }} />
                                ) : (
                                    <span className="w-2 h-2 rounded-full transition-colors duration-1000" style={{ backgroundColor: activeHex, boxShadow: 'var(--vibe-shadow)' }} />
                                )}
                                {result.engine === 'neo4j-graph' ? 'Knowledge Graph Extraction' : result.engine === 'qdrant-hybrid' ? 'Semantic Synthesis' : 'AI Synthesis'}
                                {currentVibe !== "Neutral" && <span className="text-xs px-2 py-0.5 rounded border ml-2 transition-colors duration-1000" style={{ borderColor: `color-mix(in srgb, ${activeHex} 50%, transparent)`, color: activeHex }}>Vibe: {currentVibe}</span>}
                            </h2>
                            {result.answer && result.answer.trim() !== 'Empty Response' ? (
                                <div className="prose prose-invert max-w-none text-lg leading-relaxed">
                                    {result.answer.split('\n').map((para, i) => (
                                        <p key={i} className="mb-4 last:mb-0">{para}</p>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3 py-8 text-[var(--text-muted)]">
                                    <BookOpen size={36} className="opacity-30" />
                                    <p className="text-center">No matching passages found. Try uploading more novels via your <span className="cursor-pointer underline underline-offset-2 transition-colors duration-1000" style={{ color: activeHex }} onClick={() => window.location.href = '/profile'}>Profile</span>.</p>
                                </div>
                            )}
                        </div>

                        {result.sources && result.sources.length > 0 && (
                            <>
                                <h3 className="text-sm font-bold tracking-widest text-[var(--text-muted)] uppercase mb-4 ml-2">Source Excerpts</h3>
                                <div className="grid gap-4">
                                    {result.sources.map((source, i) => {
                                        if (source.filename === "Neo4j Knowledge Graph") {
                                            const lines = source.text.replace("Graph Cypher Extraction:\n", "").split('\n').filter(Boolean);
                                            return (
                                                <div key={i} className="glass-card bg-white/[0.02] border border-white/5 group p-5">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Network size={16} className="transition-colors duration-1000" style={{ color: activeHex }} />
                                                        <span className="font-semibold text-sm transition-colors duration-1000" style={{ color: activeHex }}>Knowledge Graph Subgraph</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {lines.map((line, idx) => {
                                                            const match = line.match(/(.+) -\[(.+)\]-> (.+)/);
                                                            if (match) {
                                                                return (
                                                                    <div key={idx} className="flex items-center flex-wrap gap-1 text-xs font-mono bg-white/5 border border-white/10 rounded-md px-3 py-1.5 transition-all duration-500 hover:bg-white/10 hover:border-white/20 cursor-default">
                                                                        <span className="text-white whitespace-nowrap px-1.5 py-0.5 rounded bg-black/20 font-semibold">{match[1]}</span>
                                                                        <MoveRight size={12} className="text-white/40" />
                                                                        <span className="text-[var(--text-muted)] italic whitespace-nowrap">{match[2].replace(/_/g, ' ')}</span>
                                                                        <MoveRight size={12} className="text-white/40" />
                                                                        <span className="text-white whitespace-nowrap px-1.5 py-0.5 rounded bg-black/20 font-semibold">{match[3]}</span>
                                                                    </div>
                                                                );
                                                            }
                                                            return <span key={idx} className="text-xs font-mono text-white/50">{line}</span>;
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={i} className="glass-card bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2 transition-colors duration-1000" style={{ color: activeHex }}>
                                                        <BookOpen size={16} />
                                                        <span className="font-semibold text-sm">{source.filename}</span>
                                                    </div>
                                                    <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded-md">
                                                        Score: {source.score.toFixed(3)}
                                                    </span>
                                                </div>
                                                <p className="text-white/70 text-sm leading-relaxed italic border-l-2 pl-4 py-1 transition-colors duration-1000" style={{ borderColor: `color-mix(in srgb, ${activeHex} 50%, transparent)` }}>
                                                    "{source.text}"
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
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
