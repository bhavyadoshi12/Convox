"use client";

import React, { useState, useEffect } from 'react';
import { X, Calendar, Video, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoBrief {
    id: string;
    title: string;
}

interface CreateSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateSessionModal({ isOpen, onClose, onSuccess }: CreateSessionModalProps) {
    const [title, setTitle] = useState('');
    const [videoId, setVideoId] = useState('');
    const [scheduledStart, setScheduledStart] = useState('');
    const [videos, setVideos] = useState<VideoBrief[]>([]);
    const [loadingVideos, setLoadingVideos] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Reset and Fetch data when modal opens
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setVideoId('');
            setScheduledStart('');
            setError(null);
            setIsSuccess(false);
            fetchVideos();
        }
    }, [isOpen]);

    const fetchVideos = async () => {
        setLoadingVideos(true);
        try {
            const response = await fetch('/api/admin/videos?limit=100', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setVideos(data.videos);
            }
        } catch (err) {
            console.error('Failed to fetch videos:', err);
        } finally {
            setLoadingVideos(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !videoId || !scheduledStart) {
            setError('Please fill in all required fields.');
            return;
        }

        // Basic date validation (must be in future)
        if (new Date(scheduledStart) <= new Date()) {
            setError('Start time must be in the future.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/sessions/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    title,
                    video_id: videoId,
                    scheduled_start: scheduledStart,
                    adminMessages: [] // Start with empty admin messages
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
                setError(data.message || 'Failed to create session');
            }
        } catch (err) {
            console.error('Create session error:', err);
            setError('An error occurred while creating the session.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[#2D8CFF]" />
                        New Live Session
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
                            <h3 className="text-xl font-bold text-gray-900">Session Scheduled!</h3>
                            <p className="text-gray-500">The session has been successfully created.</p>
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
                                {/* Session Title */}
                                <div>
                                    <label htmlFor="title" className="mb-1.5 block text-sm font-semibold text-gray-700">Session Title *</label>
                                    <input
                                        id="title"
                                        type="text"
                                        required
                                        placeholder="e.g., Weekly Sync - Design Review"
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>

                                {/* Video Selection */}
                                <div>
                                    <label htmlFor="video" className="mb-1.5 block text-sm font-semibold text-gray-700">Select Video *</label>
                                    <div className="relative">
                                        <Video className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <select
                                            id="video"
                                            required
                                            className="w-full appearance-none rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF] disabled:bg-gray-50 bg-white"
                                            value={videoId}
                                            onChange={(e) => setVideoId(e.target.value)}
                                            disabled={loadingVideos}
                                        >
                                            <option value="">{loadingVideos ? 'Loading videos...' : 'Choose a video'}</option>
                                            {videos.map((v) => (
                                                <option key={v.id} value={v.id}>{v.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {videos.length === 0 && !loadingVideos && (
                                        <p className="mt-1 text-xs text-amber-600">No videos found. Please upload a video first.</p>
                                    )}
                                </div>

                                {/* Scheduled Start */}
                                <div>
                                    <label htmlFor="start" className="mb-1.5 block text-sm font-semibold text-gray-700">Scheduled Start Time *</label>
                                    <input
                                        id="start"
                                        type="datetime-local"
                                        required
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF] bg-white"
                                        value={scheduledStart}
                                        onChange={(e) => setScheduledStart(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
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
                                    disabled={submitting || !videoId || !title || !scheduledStart}
                                    className="flex-1 rounded-lg bg-[#2D8CFF] py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 disabled:opacity-50 disabled:grayscale"
                                >
                                    {submitting ? 'Creating...' : 'Create Session'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
