"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPusherClient } from '@/lib/pusher-client';
import ChatMessage from './ChatMessage';

interface ChatMessage {
    id?: string;
    sender: string;
    message: string;
    type: 'user' | 'admin';
    timestamp: string | Date;
    avatar?: string;
    userId?: string;
}

interface StudentChatPanelProps {
    sessionId: string;
    currentUserEmail: string;
    currentUserId?: string;
    messages: ChatMessage[];
    loading?: boolean;
}

export default function StudentChatPanel({ sessionId, currentUserEmail, currentUserId, messages, loading = false }: StudentChatPanelProps) {
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || sending) return;

        setSending(true);
        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sessionId,
                    message: inputValue,
                    type: 'user'
                })
            });

            const data = await response.json();
            if (data.success) {
                setInputValue('');
            } else {
                console.error('Message failed:', data.message);
            }
        } catch (err) {
            console.error('Send error:', err);
        } finally {
            setSending(false);
        }
    }, [inputValue, sending, sessionId]);

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-100 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="flex items-center gap-2 font-bold text-gray-900">
                    <MessageSquare className="h-4 w-4 text-[#2D8CFF]" />
                    Chat
                </h3>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar"
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-3">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <p className="text-xs font-medium animate-pulse">Loading messages...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-300 text-center px-6">
                        <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">No messages yet. Be the first to say something!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <ChatMessage
                            key={idx}
                            msg={msg}
                            isMe={!!(currentUserId ? msg.userId === currentUserId : (currentUserEmail && msg.sender === currentUserEmail.split('@')[0]))}
                        />
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-gray-50/50">
                <form
                    onSubmit={handleSendMessage}
                    className="relative"
                >
                    <input
                        type="text"
                        placeholder="Say something nice..."
                        className="w-full rounded-full border border-gray-200 bg-white py-3 pl-5 pr-14 text-sm focus:border-[#2D8CFF] focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all shadow-inner"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || sending}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-[#2D8CFF] text-white shadow-lg shadow-blue-200 hover:bg-blue-600 active:scale-95 disabled:grayscale disabled:opacity-50 transition-all font-bold"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div >
    );
}
