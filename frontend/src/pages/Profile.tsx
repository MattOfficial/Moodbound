import React, { useCallback, useState, useEffect, useRef } from 'react';
import { BackgroundEffect } from '../components/BackgroundEffect';
import { Navbar } from '../components/Navbar';
import { Link, useLocation } from 'react-router-dom';
import {
    uploadDocument, getDocuments, deleteDocument, type DocumentRecord,
    getUserProfile, updateUserProfile, uploadAvatar
} from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Clock, Loader2, Trash2, BookOpen, ChevronDown, ChevronRight, FolderOpen, Network, Settings, User, KeyRound, Image as ImageIcon } from 'lucide-react';

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: DocumentRecord['status'] }> = ({ status }) => {
    const config: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
        Pending: { label: 'Pending', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25', icon: <Clock size={12} /> },
        Processing: { label: 'Processing', classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25', icon: <Loader2 size={12} className="animate-spin" /> },
        Completed: { label: 'Completed', classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', icon: <CheckCircle2 size={12} /> },
        Failed: { label: 'Failed', classes: 'bg-red-500/15 text-red-400 border-red-500/25', icon: <AlertCircle size={12} /> },
    };
    const c = config[status] ?? config.Pending;
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border shrink-0 ${c.classes}`}>
            {c.icon} {c.label}
        </span>
    );
};

// ─── Collapsible Genre Section ────────────────────────────────────────────────
const GenreSection: React.FC<{
    genre: string;
    docs: DocumentRecord[];
    deletingId: string | null;
    onDelete: (doc: DocumentRecord) => void;
    formatDate: (iso: string) => string;
}> = ({ genre, docs, deletingId, onDelete, formatDate }) => {
    const [open, setOpen] = useState(true);
    return (
        <div className="mb-6">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 w-full text-left mb-3 group"
            >
                <span className="text-purple-400 opacity-80 group-hover:opacity-100 transition-opacity">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <FolderOpen size={16} className="text-purple-400 opacity-80" />
                <span className="text-sm font-bold tracking-widest uppercase text-[var(--text-muted)] group-hover:text-white transition-colors">
                    {genre}
                </span>
                <span className="text-xs font-mono text-white/25 ml-1">({docs.length})</span>
            </button>

            {open && (
                <div className="flex flex-col gap-2 pl-6 border-l border-white/[0.07]">
                    {docs.map(doc => (
                        <div
                            key={doc.id}
                            className="glass-card flex items-center gap-4 hover:bg-white/[0.05] transition-colors group/row py-3"
                        >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
                                <FileText size={16} className="text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate text-sm">{doc.filename}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">{formatDate(doc.created_at)}</p>
                            </div>

                            {['Completed', 'Processing'].includes(doc.status) && (
                                <Link
                                    to={`/graph/${doc.id}`}
                                    className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 hover:text-white transition-colors flex items-center gap-1.5 shrink-0 invisible group-hover/row:visible"
                                >
                                    <Network size={14} /> Graph
                                </Link>
                            )}

                            <button
                                onClick={() => onDelete(doc)}
                                disabled={deletingId === doc.id}
                                className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all invisible group-hover/row:visible shrink-0 disabled:cursor-not-allowed"
                                title="Delete document"
                            >
                                {deletingId === doc.id
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <Trash2 size={13} />
                                }
                            </button>

                            <StatusBadge status={doc.status} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main Profile Page ────────────────────────────────────────────────────────
export const Profile: React.FC = () => {
    const location = useLocation();
    const { profile, setProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'library' | 'settings'>(
        (location.state as any)?.activeTab || 'library'
    );

    // Listen for changes when navigated to from Navbar while already on /profile
    useEffect(() => {
        if ((location.state as any)?.activeTab) {
            setActiveTab((location.state as any).activeTab);
        }
    }, [location.state]);

    // User Profile Data
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editNickname, setEditNickname] = useState('');
    const [editPicUrl, setEditPicUrl] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editConfirmPassword, setEditConfirmPassword] = useState('');
    const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingAvatar(true);
        setProfileMessage({ text: '', type: '' });
        try {
            const updatedProfile = await uploadAvatar(file);
            setProfile(updatedProfile);
            setProfileMessage({ text: 'Profile picture uploaded successfully!', type: 'success' });
        } catch (err: any) {
            setProfileMessage({ text: err.response?.data?.detail || 'Failed to upload profile picture.', type: 'error' });
        } finally {
            setIsUploadingAvatar(false);
            // reset file input
            e.target.value = '';
        }
    };

    // Library Data
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [uploadMessage, setUploadMessage] = useState('');
    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadProfile = useCallback(async () => {
        try {
            const data = await getUserProfile();
            setProfile(data);
            setEditNickname('');
            setEditPicUrl('');
        } catch (e) {
            console.error("Failed to load profile", e);
        }
    }, [setProfile]);

    const fetchDocuments = useCallback(async () => {
        try { setDocuments(await getDocuments()); } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        loadProfile();
        fetchDocuments();
        pollingRef.current = setInterval(fetchDocuments, 5000);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [fetchDocuments, loadProfile]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMessage({ text: '', type: '' });

        if (editPassword && editPassword !== editConfirmPassword) {
            setProfileMessage({ text: 'Passwords do not match.', type: 'error' });
            return;
        }

        setIsEditingProfile(true);
        try {
            const data = await updateUserProfile({
                nickname: editNickname || undefined,
                profile_picture_url: editPicUrl || undefined,
                password: editPassword || undefined
            });
            setProfile(data);
            setEditNickname('');
            setEditPicUrl('');
            setEditPassword('');
            setEditConfirmPassword('');
            setProfileMessage({ text: 'Profile updated successfully.', type: 'success' });
        } catch (err: any) {
            setProfileMessage({ text: err.response?.data?.detail || 'Failed to update profile.', type: 'error' });
        } finally {
            setIsEditingProfile(false);
        }
    };

    // Group docs by genre
    const grouped = documents.reduce<Record<string, DocumentRecord[]>>((acc, doc) => {
        const g = doc.genre || 'Uncategorized';
        if (!acc[g]) acc[g] = [];
        acc[g].push(doc);
        return acc;
    }, {});

    const sortedGenres = Object.keys(grouped).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });

    const handleDelete = async (doc: DocumentRecord) => {
        if (deletingId) return;
        setDeletingId(doc.id);
        try {
            await deleteDocument(doc.id);
            setDocuments(prev => prev.filter(d => d.id !== doc.id));
        } catch (e) { console.error(e); } finally { setDeletingId(null); }
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files?.length) return;
        const file = files[0];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (!['pdf', 'txt', 'epub'].includes(ext)) {
            setUploadStatus('error');
            setUploadMessage('Invalid file type. Please upload PDF, TXT, or EPUB.');
            return;
        }
        setIsUploading(true);
        setUploadStatus('idle');
        try {
            await uploadDocument(file);
            setUploadStatus('success');
            setUploadMessage(`"${file.name}" uploaded and queued for vectorization!`);
            await fetchDocuments();
        } catch (err: any) {
            setUploadStatus('error');
            setUploadMessage('Upload failed. ' + (err.response?.data?.detail || err.message));
        } finally { setIsUploading(false); setIsDragging(false); }
    };

    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
    const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }, []);
    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files);

    const formatDate = (iso: string) =>
        iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const getAvatarSrc = () => {
        if (profile?.profile_picture_url) return profile.profile_picture_url;
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || 'default'}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    };

    return (
        <div className="relative min-h-screen flex flex-col font-sans text-white">
            <BackgroundEffect />
            <Navbar />

            <main className="relative z-10 flex-1 px-8 pt-8 pb-20 max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-10">

                {/* Left Sidebar Profile Section */}
                <aside className="w-full md:w-72 shrink-0">
                    <div className="glass-card p-6 flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                            <img src={getAvatarSrc()} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-xl font-bold">{profile?.nickname || 'Vibe Navigator'}</h2>
                        <p className="text-[var(--text-muted)] text-sm mb-6">{profile?.email}</p>

                        <div className="w-full flex md:flex-col gap-2">
                            <button
                                onClick={() => setActiveTab('library')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full ${activeTab === 'library' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'hover:bg-white/5 text-[var(--text-muted)] hover:text-white'}`}
                            >
                                <BookOpen size={18} /> My Library
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full ${activeTab === 'settings' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'hover:bg-white/5 text-[var(--text-muted)] hover:text-white'}`}
                            >
                                <Settings size={18} /> Settings
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1">
                    {activeTab === 'library' && (
                        <div className="animate-slideUp">
                            <div className="mb-8">
                                <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Your Library</h1>
                                <p className="text-[var(--text-muted)]">
                                    Upload novels to expand your AI's knowledge base.
                                </p>
                            </div>

                            {/* Upload Zone */}
                            <div
                                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                                className={`w-full rounded-[28px] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center py-10 gap-5 bg-[var(--glass-bg)] backdrop-blur-xl mb-6
                                ${isDragging ? 'border-purple-400 bg-purple-500/10 scale-[1.01]' : 'border-white/15 hover:border-purple-500/50 hover:bg-white/5'}
                                ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
                            >
                                <input type="file" id="file-upload" className="hidden" accept=".txt,.pdf,.epub" onChange={onFileInput} />
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 size={40} className="text-purple-400 animate-spin" />
                                        <p className="font-semibold text-lg">Uploading...</p>
                                    </div>
                                ) : (
                                    <label htmlFor="file-upload" className="flex flex-col items-center gap-3 cursor-pointer text-center">
                                        <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                                            <UploadCloud size={28} className="text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold">Drag & drop your novel here</p>
                                            <p className="text-[var(--text-muted)] mt-1 text-sm">or click to browse — PDF, EPUB, TXT</p>
                                        </div>
                                    </label>
                                )}
                            </div>

                            {/* Upload Status Toast */}
                            {uploadStatus !== 'idle' && (
                                <div className={`mb-6 p-4 rounded-2xl backdrop-blur-lg flex items-center gap-3
                                ${uploadStatus === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-100' : 'bg-red-500/10 border border-red-500/20 text-red-100'}`}>
                                    {uploadStatus === 'success'
                                        ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                                        : <AlertCircle size={18} className="text-red-400 shrink-0" />}
                                    <p className="text-sm">{uploadMessage}</p>
                                </div>
                            )}

                            {/* Book List grouped by genre */}
                            <div>
                                <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-muted)] mb-5">
                                    Indexed Books ({documents.length})
                                </h2>

                                {documents.length === 0 ? (
                                    <div className="glass-card flex flex-col items-center justify-center py-16 gap-4 text-[var(--text-muted)]">
                                        <BookOpen size={48} className="opacity-25" />
                                        <p className="font-semibold text-lg opacity-60">No books indexed yet</p>
                                        <p className="text-sm opacity-40">Upload your first novel to get started!</p>
                                    </div>
                                ) : (
                                    sortedGenres.map(genre => (
                                        <GenreSection
                                            key={genre}
                                            genre={genre}
                                            docs={grouped[genre]}
                                            deletingId={deletingId}
                                            onDelete={handleDelete}
                                            formatDate={formatDate}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="animate-slideUp">
                            <div className="mb-8">
                                <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Profile Settings</h1>
                                <p className="text-[var(--text-muted)]">Manage your account details and personalization.</p>
                            </div>

                            <form onSubmit={handleProfileUpdate} className="glass-card p-8 space-y-6">
                                {profileMessage.text && (
                                    <div className={`p-4 rounded-lg flex items-center gap-3 border ${profileMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-red-500/10 border-red-500/20 text-red-200'}`}>
                                        {profileMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                        <p className="text-sm">{profileMessage.text}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2"><User size={16} /> Nickname</label>
                                    <input
                                        type="text"
                                        value={editNickname}
                                        onChange={(e) => setEditNickname(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                                        placeholder={profile?.nickname || "Vibe Navigator"}
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2"><ImageIcon size={16} /> Profile Picture</label>
                                    <div className="flex gap-3 items-center">
                                        <input
                                            type="url"
                                            value={editPicUrl}
                                            onChange={(e) => setEditPicUrl(e.target.value)}
                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                                            placeholder={profile?.profile_picture_url || "https://example.com/avatar.png"}
                                        />
                                        <div className="relative shrink-0">
                                            <input
                                                type="file"
                                                id="avatar-upload"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                            />
                                            <label
                                                htmlFor="avatar-upload"
                                                className="cursor-pointer px-4 py-3 rounded-xl font-medium transition-all bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/10 h-[50px]"
                                            >
                                                {isUploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : 'Upload File'}
                                            </label>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/40 mt-2">Enter an image URL or upload a file from your device.</p>
                                </div>

                                <div className="border-t border-white/10 my-6"></div>
                                <h3 className="text-lg font-semibold mb-4 text-white/90">Change Password</h3>

                                <div>
                                    <label className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2"><KeyRound size={16} /> New Password</label>
                                    <input
                                        type="password"
                                        value={editPassword}
                                        onChange={(e) => setEditPassword(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                                        placeholder="Leave blank to keep current password"
                                    />
                                </div>

                                {editPassword && (
                                    <div>
                                        <label className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={editConfirmPassword}
                                            onChange={(e) => setEditConfirmPassword(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isEditingProfile}
                                    className="pt-2"
                                >
                                    <div className={`px-6 py-3 rounded-xl font-medium transition-all ${isEditingProfile ? 'bg-white/10 text-white/50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]'}`}>
                                        {isEditingProfile ? 'Saving...' : 'Save Changes'}
                                    </div>
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
