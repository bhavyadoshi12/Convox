"use client";

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
    Plus,
    Trash2,
    Calendar,
    Clock,
    Video,
    AlertCircle,
    CheckCircle2,
    MessageSquare,
    ChevronRight,
    Monitor,
    Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface VideoRef {
    id: string;
    title: string;
    duration: number;
}

interface AdminMessage {
    timestamp: number | string;
    message: string;
    id?: string; // Local ID for UI management
}

interface SessionFormProps {
    sessionId?: string;
    onSuccess?: () => void;
}

function SessionForm({ sessionId, onSuccess }: SessionFormProps) {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [selectedVideoId, setSelectedVideoId] = useState('');
    const [scheduledStart, setScheduledStart] = useState('');
    const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);

    const [videos, setVideos] = useState<VideoRef[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<VideoRef | null>(null);

    const [loading, setLoading] = useState(false);
    const [loadingVideos, setLoadingVideos] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Fetch Videos
    useEffect(() => {
        const fetchVideos = async () => {
            setLoadingVideos(true);
            try {
                const response = await fetch('/api/admin/videos?limit=100', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
        fetchVideos();
    }, []);

    // Fetch Session for Edit Mode
    useEffect(() => {
        if (sessionId) {
            const fetchSession = async () => {
                setLoading(true);
                try {
                    const response = await fetch(`/api/admin/sessions`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    const data = await response.json();
                    if (data.success) {
                        const session = data.sessions.find((s: any) => s.sessionId === sessionId || s.id === sessionId);
                        if (session) {
                            setTitle(session.title);
                            setSelectedVideoId(session.video_id.id || session.video_id);
                            // Format Date for datetime-local (Account for timezone offset)
                            const date = new Date(session.scheduled_start);
                            const offset = date.getTimezoneOffset() * 60000;
                            const localDate = new Date(date.getTime() - offset);
                            const formattedDate = localDate.toISOString().slice(0, 16);
                            setScheduledStart(formattedDate);
                            setAdminMessages(session.adminMessages || []);
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch session:', err);
                    setError('Failed to load session details');
                } finally {
                    setLoading(false);
                }
            };
            fetchSession();
        }
    }, [sessionId]);

    // Update selected video info
    useEffect(() => {
        const video = videos.find(v => v.id === selectedVideoId);
        setSelectedVideo(video || null);
    }, [selectedVideoId, videos]);

    const addMessage = useCallback(() => {
        setAdminMessages(prev => [...prev, { timestamp: '', message: '', id: Math.random().toString(36).substr(2, 9) }]);
    }, []);

    const removeMessage = useCallback((index: number) => {
        setAdminMessages(prev => {
            const next = [...prev];
            next.splice(index, 1);
            return next;
        });
    }, []);

    const updateMessage = useCallback((index: number, field: keyof AdminMessage, value: any) => {
        setAdminMessages(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !selectedVideoId || !scheduledStart) {
            setError('Please fill in all required fields');
            return;
        }

        // Validation
        const startTime = new Date(scheduledStart);
        if (!sessionId && startTime <= new Date()) {
            setError('Scheduled start must be in the future');
            return;
        }

        if (selectedVideo) {
            for (const msg of adminMessages) {
                // Safely parse timestamp for validation
                const ts = Number(msg.timestamp);
                if (isNaN(ts) || ts < 0 || ts > selectedVideo.duration) {
                    setError(`Invalid message timestamp: ${msg.timestamp}. Must be between 0 and ${selectedVideo.duration}s`);
                    return;
                }
            }
        }

        // Check for duplicate timestamps
        const timestamps = adminMessages.map(m => Number(m.timestamp));
        if (new Set(timestamps).size !== timestamps.length) {
            setError('Duplicate timestamps are not allowed for admin messages');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const url = sessionId ? `/api/admin/sessions/${sessionId}` : '/api/admin/sessions/create';
            const method = sessionId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    title,
                    video_id: selectedVideoId,
                    scheduled_start: scheduledStart,
                    adminMessages: adminMessages.map(({ timestamp, message }) => ({
                        timestamp: Number(timestamp) || 0, // Ensure valid number on submit 
                        message
                    }))
                })
            });

            const data = await response.json();
            if (data.success) {
                setIsSuccess(true);
                if (onSuccess) {
                    setTimeout(() => {
                        onSuccess();
                    }, 1000);
                } else {
                    router.push('/admin/sessions');
                }
            } else {
                setError(data.message || 'Action failed');
            }
        } catch (err) {
            console.error('Submit error:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }, [title, selectedVideoId, scheduledStart, sessionId, selectedVideo, adminMessages, onSuccess, router]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2D8CFF] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                {isSuccess && (
                    <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-600">
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                        <p className="font-bold">Session {sessionId ? 'updated' : 'created'} successfully!</p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {/* Left Column: Basic Info */}
                    <div className="space-y-6">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <div className="rounded-lg bg-blue-50 p-1.5">
                                <Calendar className="h-4 w-4 text-[#2D8CFF]" />
                            </div>
                            Basic Information
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Session Title *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Morning Yoga Live"
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 transition-all focus:border-[#2D8CFF] focus:outline-none focus:ring-4 focus:ring-blue-50"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Select Video *</label>
                                <div className="relative">
                                    <Video className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <select
                                        required
                                        className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none focus:ring-4 focus:ring-blue-50"
                                        value={selectedVideoId}
                                        onChange={(e) => setSelectedVideoId(e.target.value)}
                                        disabled={loadingVideos}
                                    >
                                        <option value="">{loadingVideos ? 'Loading...' : 'Choose a lesson video'}</option>
                                        {videos.map(v => (
                                            <option key={v.id} value={v.id}>{v.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Start Date & Time *</label>
                                <div className="relative">
                                    <Clock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="datetime-local"
                                        required
                                        min={new Date().toISOString().slice(0, 16)}
                                        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none focus:ring-4 focus:ring-blue-50"
                                        value={scheduledStart}
                                        onChange={(e) => setScheduledStart(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Video Overview & Preview */}
                    <div className="space-y-6">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <div className="rounded-lg bg-purple-50 p-1.5">
                                <Monitor className="h-4 w-4 text-purple-500" />
                            </div>
                            Video Overview
                        </h3>
                        {selectedVideo ? (
                            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
                                <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-gray-200">
                                    <div className="flex h-full w-full items-center justify-center bg-gray-900">
                                        <Play className="h-10 w-10 text-white/50" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900">{selectedVideo.title}</p>
                                    <p className="text-sm text-gray-500">Duration: {Math.floor(selectedVideo.duration / 60)}m {Math.floor(selectedVideo.duration % 60)}s</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex aspect-video items-center justify-center rounded-2xl border-2 border-dashed border-gray-100 text-sm text-gray-400">
                                Select a video to see details
                            </div>
                        )}
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* Admin Messages Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                            <div className="rounded-lg bg-amber-50 p-1.5">
                                <MessageSquare className="h-4 w-4 text-amber-500" />
                            </div>
                            Scheduled Admin Messages
                        </h3>
                        <button
                            type="button"
                            onClick={addMessage}
                            disabled={!selectedVideo}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2D8CFF] hover:underline disabled:opacity-40 disabled:no-underline"
                        >
                            <Plus className="h-4 w-4" /> Add Message
                        </button>
                    </div>
                    {!selectedVideo && (
                        <p className="text-xs text-amber-600 font-medium -mt-4 text-right">
                            * Select a video first to schedule messages
                        </p>
                    )}

                    {/* Timeline Visualizer */}
                    {selectedVideo && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-gray-400">
                                <span>Timeline (0s)</span>
                                <span>{selectedVideo.duration}s</span>
                            </div>
                            <div className="relative h-4 w-full rounded-full bg-gray-100 border border-gray-100 overflow-visible shadow-inner">
                                {adminMessages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className="absolute top-1/2 -ml-1.5 h-6 w-3 -translate-y-1/2 rounded bg-[#2D8CFF] border-2 border-white shadow-sm ring-1 ring-blue-100 group cursor-pointer transition-transform hover:scale-110"
                                        style={{ left: `${(Number(msg.timestamp) / selectedVideo.duration) * 100}%` }}
                                        title={`Message at ${msg.timestamp}s`}
                                    >
                                        <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white group-hover:block">
                                            {msg.timestamp}s: {msg.message || '(Empty)'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages List */}
                    <div className="space-y-4">
                        {adminMessages.map((msg, index) => (
                            <div key={index} className="flex gap-4 items-start rounded-xl border border-gray-100 p-4 transition-all hover:bg-gray-50/30">
                                <div className="w-24 flex-shrink-0">
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Time (s)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={selectedVideo?.duration || 10000}
                                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none"
                                        value={msg.timestamp}
                                        onChange={(e) => updateMessage(index, 'timestamp', e.target.value)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Message Content</label>
                                    <textarea
                                        rows={1}
                                        placeholder="Type your automated message..."
                                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none resize-none"
                                        value={msg.message}
                                        onChange={(e) => updateMessage(index, 'message', e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeMessage(index)}
                                    className="mt-6 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        {adminMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed border-gray-50 bg-gray-50/20">
                                <MessageSquare className="h-8 w-8 text-gray-200 mb-2" />
                                <p className="text-sm text-gray-400">No scheduled messages. Add one to engage with students automatically.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 border-t pt-6">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        disabled={submitting}
                        className="rounded-xl px-6 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2D8CFF] px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-600 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                        {submitting ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        ) : (
                            sessionId ? 'Update Session' : 'Create Session'
                        )}
                        {!submitting && <ChevronRight className="h-4 w-4" />}
                    </button>
                </div>
            </form>
        </div>
    );
}
export default memo(SessionForm);
