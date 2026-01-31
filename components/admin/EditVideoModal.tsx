"use client";

import React, { useState, useEffect } from 'react';
import { X, Video, AlertCircle, CheckCircle2 } from 'lucide-react';

interface VideoData {
    id: string;
    title: string;
    description?: string;
    duration: number;
}

interface EditVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    video: VideoData | null;
}

export default function EditVideoModal({ isOpen, onClose, onSuccess, video }: EditVideoModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [thumbnail, setThumbnail] = useState<File | null>(null);

    useEffect(() => {
        if (isOpen && video) {
            setTitle(video.title);
            setDescription(video.description || '');
            setDuration(video.duration || 0);
            setThumbnail(null);
            setError(null);
            setIsSuccess(false);
        }
    }, [isOpen, video]);

    if (!isOpen || !video) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            let thumbnailPath = '';

            // Upload thumbnail if selected
            if (thumbnail) {
                const token = localStorage.getItem('token');
                // 1. Get Signed URL
                const thumbResponse = await fetch('/api/admin/videos/get-upload-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ filename: thumbnail.name, fileType: thumbnail.type })
                });
                const thumbData = await thumbResponse.json();

                if (!thumbData.success) throw new Error('Failed to get upload URL for thumbnail');

                // 2. Upload to Storage
                await fetch(thumbData.signedUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': thumbnail.type },
                    body: thumbnail
                });

                thumbnailPath = thumbData.fullPath;
            }

            // 3. Update Video Record
            const response = await fetch(`/api/admin/videos/${video.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    duration,
                    thumbnailPath // Send path if we uploaded a new one
                })
            });

            const data = await response.json();
            if (data.success) {
                setIsSuccess(true);
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1500);
            } else {
                setError(data.message || 'Failed to update video');
            }
        } catch (err: any) {
            console.error('Update video error:', err);
            setError(err.message || 'An error occurred while updating the video.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Video className="h-5 w-5 text-[#2D8CFF]" />
                        Edit Video
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center animate-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-4 rounded-full bg-green-100 p-4">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Video Updated!</h3>
                            <p className="text-gray-500">The video details have been successfully saved.</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="edit-title" className="mb-1.5 block text-sm font-semibold text-gray-700">Video Title *</label>
                                    <input
                                        id="edit-title"
                                        type="text"
                                        required
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF] appearance-none"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="edit-desc" className="mb-1.5 block text-sm font-semibold text-gray-700">Description</label>
                                    <textarea
                                        id="edit-desc"
                                        rows={3}
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF] appearance-none"
                                    />
                                </div>

                                {/* Thumbnail Input */}
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Update Thumbnail (Optional)</label>
                                    <div className="flex items-center gap-4 rounded-xl border border-gray-200 p-3 bg-gray-50/50">
                                        <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                                            {thumbnail ? (
                                                <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Selected
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-400">Current</div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#2D8CFF]/10 file:text-[#2D8CFF] hover:file:bg-[#2D8CFF]/20"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) setThumbnail(e.target.files[0]);
                                            }}
                                        />
                                    </div>
                                    <p className="mt-1 text-[10px] text-gray-400 pl-1">Leaves empty to keep existing thumbnail.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 border border-gray-100">
                                    <div className="col-span-2 text-xs font-bold text-gray-500 uppercase mb-1">Video Duration (Required for Sync)</div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-gray-600">Minutes</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none"
                                            value={Math.floor(duration / 60) || ''}
                                            onChange={(e) => setDuration(prev => (prev % 60) + (parseInt(e.target.value) || 0) * 60)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-gray-600">Seconds</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none"
                                            value={duration % 60 || ''}
                                            onChange={(e) => setDuration(prev => (Math.floor(prev / 60) * 60) + (parseInt(e.target.value) || 0))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 border-t pt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={submitting}
                                    className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !title}
                                    className="flex-1 rounded-lg bg-[#2D8CFF] py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 disabled:opacity-50 disabled:grayscale"
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
