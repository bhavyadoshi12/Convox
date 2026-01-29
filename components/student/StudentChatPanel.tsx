"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, MessageSquare, Trash2 } from 'lucide-react';
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
    currentUserRole?: string; // Added role prop
    messages: ChatMessage[];
    loading?: boolean;
}

export default function StudentChatPanel({ sessionId, currentUserEmail, currentUserId, currentUserRole, messages: initialMessages, loading = false }: StudentChatPanelProps) {
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]); // manage messages locally to handle deletes

    useEffect(() => {
        setLocalMessages(initialMessages);
    }, [initialMessages]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [localMessages]);

    // Listen for deletes
    useEffect(() => {
        const pusher = getPusherClient();
        const channel = pusher.subscribe(`session-${sessionId}`);
        channel.bind('message-deleted', (data: { messageId: string }) => {
            setLocalMessages(prev => prev.filter(m => m.id !== data.messageId));
        });

        return () => {
            channel.unbind('message-deleted');
        };
    }, [sessionId]);

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
                    type: currentUserRole === 'admin' ? 'admin' : 'user' // auto-detect type
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
    }, [inputValue, sending, sessionId, currentUserRole]);

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            await fetch('/api/chat/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sessionId,
                    messageId
                })
            });
            // Optimistic update
            setLocalMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

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
                ) : localMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-300 text-center px-6">
                        <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">No messages yet. Be the first to say something!</p>
                    </div>
                ) : (
                    localMessages.map((msg, idx) => (
                        <div key={idx} className="group relative">
                            <ChatMessage
                                msg={msg}
                                isMe={!!(currentUserId ? msg.userId === currentUserId : (currentUserEmail && msg.sender === currentUserEmail.split('@')[0]))}
                            />
                            {currentUserRole === 'admin' && msg.id && (
                                <button
                                    onClick={() => handleDeleteMessage(msg.id!)}
                                    className="absolute top-0 right-0 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded"
                                    title="Delete Message"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            )}
                        </div>
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

