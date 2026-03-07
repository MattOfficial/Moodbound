import React, { useCallback, useState } from 'react';
import { BackgroundEffect } from '../components/BackgroundEffect';
import { Navbar } from '../components/Navbar';
import { uploadDocument } from '../api/client';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const Library: React.FC = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        const validTypes = ['application/pdf', 'text/plain', 'application/epub+zip'];
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!validTypes.includes(file.type) && !['pdf', 'txt', 'epub'].includes(extension || '')) {
            setUploadStatus('error');
            setMessage('Invalid file type. Please upload PDF, TXT, or EPUB.');
            return;
        }

        setIsUploading(true);
        setUploadStatus('idle');
        setMessage('');

        try {
            await uploadDocument(file);
            setUploadStatus('success');
            setMessage(`"${file.name}" uploaded successfully! It is now being vectorized by the AI.`);
        } catch (err: any) {
            console.error(err);
            setUploadStatus('error');
            setMessage('Upload failed. ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsUploading(false);
            setIsDragging(false);
        }
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, []);

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
    };

    return (
        <div className="relative min-h-screen flex flex-col font-sans text-white overflow-x-hidden">
            <BackgroundEffect />
            <Navbar />

            <main className="relative z-10 flex-1 flex flex-col items-center pt-20 px-8 max-w-5xl mx-auto w-full">
                <div className="w-full text-center mb-12 animate-[slideUp_0.8s_ease-out_forwards]">
                    <h1 className="text-4xl font-extrabold mb-4">Your Library</h1>
                    <p className="text-lg text-[var(--text-muted)]">Upload novels to expand your AI's knowledge base.</p>
                </div>

                {/* Drag and Drop Zone */}
                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`w-full max-w-3xl aspect-[16/7] rounded-[32px] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-6 cursor-pointer bg-[var(--glass-bg)] backdrop-blur-xl animate-[slideUp_0.8s_ease-out_0.2s_forwards] opacity-0 translate-y-5
            ${isDragging ? 'border-purple-400 bg-purple-500/10 scale-[1.02]' : 'border-white/20 hover:border-purple-500/50 hover:bg-white/5'}
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
                >
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".txt,.pdf,.epub"
                        onChange={onFileInput}
                    />
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-10">
                        {isUploading ? (
                            <div className="flex flex-col items-center animate-pulse">
                                <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin mb-6" />
                                <h3 className="text-xl font-bold">Uploading Document...</h3>
                                <p className="text-[var(--text-muted)] mt-2">Sending bytes into the vector space</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(168,85,247,0.15)] group-hover:scale-110 transition-transform">
                                    <UploadCloud size={40} className="text-purple-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3">Drag & drop your novel here</h3>
                                <p className="text-[var(--text-muted)] text-lg mb-8">or click to browse from your computer</p>
                                <div className="flex items-center gap-6 text-sm text-[var(--text-muted)] bg-white/5 px-6 py-3 rounded-full">
                                    <span className="flex items-center gap-2"><FileText size={16} className="text-purple-400" /> PDF</span>
                                    <div className="w-1 h-1 rounded-full bg-white/20" />
                                    <span className="flex items-center gap-2"><FileText size={16} className="text-pink-400" /> EPUB</span>
                                    <div className="w-1 h-1 rounded-full bg-white/20" />
                                    <span className="flex items-center gap-2"><FileText size={16} className="text-cyan-400" /> TXT</span>
                                </div>
                            </>
                        )}
                    </label>
                </div>

                {/* Status Messages */}
                {uploadStatus !== 'idle' && (
                    <div className={`mt-8 p-6 rounded-2xl backdrop-blur-lg flex items-start gap-4 max-w-3xl w-full animate-[slideUp_0.4s_ease-out_forwards]
            ${uploadStatus === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-100' : 'bg-red-500/10 border border-red-500/20 text-red-100'}
          `}>
                        {uploadStatus === 'success' ? <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="text-red-400 shrink-0 mt-0.5" />}
                        <div>
                            <h4 className="font-bold text-lg mb-1">{uploadStatus === 'success' ? 'Upload Successful' : 'Upload Failed'}</h4>
                            <p className="opacity-80">{message}</p>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};
