"use client";

import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import { Plus, Trash2, Edit2, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    timestamp: number;
    message: string;
    id: string;
}

interface MessageSchedulerProps {
    videoDuration: number;
    messages: Message[];
    onChange: (messages: Message[]) => void;
}

const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function MessageScheduler({ videoDuration, messages, onChange }: MessageSchedulerProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<string | null>(null);

    const handleTimelineClick = (e: MouseEvent<HTMLDivElement>) => {
        if (isDragging || !timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const timestamp = Math.round(percentage * videoDuration);

        // Check if message at this timestamp already exists
        if (messages.some(m => m.timestamp === timestamp)) return;

        const newMessage: Message = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp,
            message: 'New scheduled message'
        };

        onChange([...messages, newMessage].sort((a, b) => a.timestamp - b.timestamp));
        setEditingId(newMessage.id);
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        setHoverTime(Math.round(percentage * videoDuration));
    };

    const handleMarkerDragStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setIsDragging(id);
    };

    useEffect(() => {
        const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
            if (!isDragging || !timelineRef.current) return;

            const rect = timelineRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            const newTimestamp = Math.round(percentage * videoDuration);

            const updatedMessages = messages.map(m =>
                m.id === isDragging ? { ...m, timestamp: newTimestamp } : m
            ).sort((a, b) => a.timestamp - b.timestamp);

            onChange(updatedMessages);
        };

        const handleGlobalMouseUp = () => {
            setIsDragging(null);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, videoDuration, messages, onChange]);

    const deleteMessage = (id: string) => {
        onChange(messages.filter(m => m.id !== id));
        if (editingId === id) setEditingId(null);
    };

    const updateMessageContent = (id: string, text: string) => {
        onChange(messages.map(m => m.id === id ? { ...m, message: text } : m));
    };

    return (
        <div className="space-y-8 select-none">
            {/* Timeline Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
                    <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Interactive Timeline</span>
                    </div>
                    <span>{formatTime(videoDuration)}</span>
                </div>

                <div className="relative pt-4 pb-8 px-2">
                    {/* Main Bar */}
                    <div
                        ref={timelineRef}
                        onClick={handleTimelineClick}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setHoverTime(null)}
                        className="group relative h-4 w-full cursor-crosshair rounded-full bg-gray-100 border border-gray-100 shadow-inner overflow-visible transition-all hover:bg-gray-200/50"
                    >
                        {/* Hover Indicator */}
                        {hoverTime !== null && !isDragging && (
                            <div
                                className="absolute top-0 h-full w-0.5 bg-blue-200 pointer-events-none"
                                style={{ left: `${(hoverTime / videoDuration) * 100}%` }}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-white">
                                    {formatTime(hoverTime)}
                                </div>
                            </div>
                        )}

                        {/* Markers */}
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                onMouseDown={(e) => handleMarkerDragStart(e, msg.id)}
                                onClick={(e) => { e.stopPropagation(); setEditingId(msg.id); }}
                                className={cn(
                                    "absolute top-1/2 -ml-2 h-7 w-4 -translate-y-1/2 cursor-grab rounded-md border-2 border-white shadow-md transition-all active:cursor-grabbing hover:scale-110 z-10",
                                    editingId === msg.id ? "bg-[#2D8CFF] ring-4 ring-blue-100" : "bg-[#2D8CFF]/80 hover:bg-[#2D8CFF]"
                                )}
                                style={{ left: `${(msg.timestamp / videoDuration) * 100}%` }}
                            >
                                {/* Tooltip */}
                                <div className={cn(
                                    "absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-[10px] text-white transition-opacity",
                                    isDragging === msg.id || editingId === msg.id ? "bg-gray-900 opacity-100" : "bg-gray-700 opacity-0 group-hover:opacity-100"
                                )}>
                                    {formatTime(msg.timestamp)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-medium">
                        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                            <span key={p}>{formatTime(videoDuration * p)}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Message List */}
            <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <MessageSquare className="h-4 w-4 text-[#2D8CFF]" />
                    Scheduled Messages ({messages.length})
                </h3>

                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {messages.length > 0 ? (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "group flex flex-col gap-3 rounded-xl border p-4 transition-all",
                                    editingId === msg.id
                                        ? "border-[#2D8CFF] bg-blue-50/30 shadow-sm"
                                        : "border-gray-100 bg-white hover:border-gray-200"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                                            {formatTime(msg.timestamp)}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                                            Offset: {msg.timestamp}s
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setEditingId(editingId === msg.id ? null : msg.id)}
                                            className="rounded-md p-1.5 text-gray-400 hover:bg-white hover:text-[#2D8CFF]"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => deleteMessage(msg.id)}
                                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {editingId === msg.id ? (
                                    <textarea
                                        autoFocus
                                        className="w-full rounded-lg border border-blue-200 bg-white p-3 text-sm focus:border-[#2D8CFF] focus:outline-none focus:ring-4 focus:ring-blue-50 resize-none shadow-inner"
                                        rows={2}
                                        value={msg.message}
                                        onChange={(e) => updateMessageContent(msg.id, e.target.value)}
                                        placeholder="Enter automated message..."
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 line-clamp-2 italic font-medium">
                                        {msg.message || <span className="text-gray-300">No message content...</span>}
                                    </p>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/30">
                            <div className="rounded-full bg-white p-4 shadow-sm mb-3">
                                <Plus className="h-6 w-6 text-[#2D8CFF]/50" />
                            </div>
                            <p className="text-sm font-medium text-gray-400">Click the timeline above to schedule a message</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
