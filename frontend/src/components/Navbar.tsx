import React from 'react';
import { BookOpen, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
    return (
        <nav className="relative z-10 px-10 py-6 flex justify-between items-center w-full">
            <Link to="/" className="flex items-center gap-3 text-2xl font-extrabold tracking-tight hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] flex items-center justify-center relative">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white z-10">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <div className="absolute inset-[-2px] rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 blur-sm opacity-60 -z-10" />
                </div>
                <div>
                    Vibe <span className="bg-gradient-to-r from-white to-purple-500 bg-clip-text text-transparent">Novel</span>
                </div>
            </Link>

            <div className="flex gap-4">
                <Link to="/library" className="btn-glass">
                    <BookOpen size={18} />
                    Upload Library
                </Link>
                <button className="w-[42px] h-[42px] rounded-full grid place-items-center bg-gradient-to-br from-white/10 to-white/5 border border-white/15 hover:bg-white/20 transition-colors cursor-pointer">
                    <User size={20} className="text-[var(--text-main)]" />
                </button>
            </div>
        </nav>
    );
};
