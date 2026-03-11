import React, { useState } from 'react';
import { BookOpen, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Navbar: React.FC = () => {
    const { logout, profile } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const getAvatarSrc = () => {
        if (profile?.profile_picture_url) return profile.profile_picture_url;
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || 'default'}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    };

    return (
        <nav className="relative z-50 px-10 py-6 flex justify-between items-center w-full">
            <Link to="/" className="flex items-center gap-3 text-2xl font-extrabold tracking-tight hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] flex items-center justify-center relative">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white z-10">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <div className="absolute inset-[-2px] rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 blur-sm opacity-60 -z-10" />
                </div>
                <div>
                    Mood<span className="bg-gradient-to-r from-white to-purple-500 bg-clip-text text-transparent">bound</span>
                </div>
            </Link>

            <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-[42px] h-[42px] rounded-full grid place-items-center bg-gradient-to-br from-white/10 to-white/5 border border-white/15 hover:bg-white/20 transition-colors cursor-pointer overflow-hidden p-[2px]"
                >
                    <img src={getAvatarSrc()} alt="Profile" className="w-full h-full object-cover rounded-full" />
                </button>

                {isMenuOpen && (
                    <>
                        <div className="fixed inset-0" onClick={() => setIsMenuOpen(false)} />
                        <div className="absolute right-0 mt-3 w-48 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden py-2 animate-slideUp origin-top-right">
                            <Link to="/profile" state={{ activeTab: 'library' }} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm text-[var(--text-main)] w-full text-left">
                                <BookOpen size={16} />
                                My Library
                            </Link>
                            <Link to="/profile" state={{ activeTab: 'settings' }} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm text-[var(--text-main)] w-full text-left">
                                <Settings size={16} />
                                Profile & Settings
                            </Link>
                            <div className="h-px bg-white/10 my-1 mx-2" />
                            <button onClick={() => { logout(); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm text-[var(--text-main)] w-full text-left">
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
};
