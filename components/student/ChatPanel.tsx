"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPusherClient } from '@/lib/pusher-client';

interface Message {
    id?: string;
    sender: string;
    message: string;
    type: 'admin' | 'user';
    timestamp: number;
    avatar?: string;
}

interface ChatPanelProps {
    sessionId: string;
    adminMessages: Message[];
    currentUserId: string;
    currentUserName: string;
}

export default function ChatPanel({
    sessionId,
    adminMessages: initialAdminMessages,
    currentUserId,
    currentUserName
}: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize messages with historic data if any, or just empty
    useEffect(() => {
        // In a real app, combine historic DB messages with these
        setMessages([]);
    }, [sessionId]);

    // Pusher Integration
    useEffect(() => {
        const pusher = getPusherClient();
        const channel = pusher.subscribe(`session-${sessionId}`);

        channel.bind('new-message', (data: Message) => {
            setMessages(prev => [...prev, data]);
        });

        return () => {
            pusher.unsubscribe(`session-${sessionId}`);
        };
    }, [sessionId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isSending) return;

        setIsSending(true);
        const newMessage: Message = {
            sender: currentUserName,
            message: inputValue,
            type: 'user',
            timestamp: Date.now()
        };

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
                console.error('Failed to send message:', data.message);
            }
        } catch (err) {
            console.error('Chat error:', err);
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-100 shadow-2xl overflow-hidden">
            {/* Chat Header */}
            <div className="flex h-14 items-center justify-between border-b px-5 bg-white z-10">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-50 p-1.5">
                        <MessageSquare className="h-4 w-4 text-[#2D8CFF]" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Session Chat</h3>
                </div>
            </div>

            {/* Messages list */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth custom-scrollbar bg-gray-50/30"
            >
                {messages.map((msg, index) => {
                    const isMe = msg.sender === currentUserName;
                    const isAdmin = msg.type === 'admin';

                    return (
                        <div
                            key={index}
                            className={cn(
                                "flex flex-col group",
                                isMe ? "items-end ml-auto" : "items-start mr-auto",
                                isAdmin && "items-start w-full"
                            )}
                        >
                            {/* Sender Name */}
                            <div className="flex items-center gap-2 mb-1 px-1">
                                {isAdmin && <ShieldCheck className="h-3 w-3 text-[#2D8CFF]" />}
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    isAdmin ? "text-[#2D8CFF]" : "text-gray-400"
                                )}>
                                    {isAdmin ? 'Instructor' : msg.sender}
                                </span>
                            </div>

                            {/* Bubble */}
                            <div className={cn(
                                "relative max-w-[90%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all duration-300",
                                isMe
                                    ? "bg-[#2D8CFF] text-white rounded-tr-none hover:shadow-md hover:-translate-y-0.5"
                                    : "bg-white border border-gray-100 text-gray-700 rounded-tl-none hover:border-gray-200",
                                isAdmin && "bg-blue-50/80 border-blue-100 text-[#2D8CFF] font-medium"
                            )}>
                                {msg.message}

                                {/* Micro Timestamp */}
                                <span className={cn(
                                    "absolute -bottom-4 whitespace-nowrap text-[8px] font-bold transition-opacity opacity-0 group-hover:opacity-100",
                                    isMe ? "right-0 text-[#2D8CFF]/50" : "left-0 text-gray-400"
                                )}>
                                    {formatTime(msg.timestamp)}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="rounded-full bg-white p-6 shadow-sm mb-4">
                            <UserIcon className="h-10 w-10 text-gray-200" />
                        </div>
                        <p className="text-sm font-bold text-gray-400">Welcome to the session!</p>
                        <p className="text-xs text-gray-300">Be the first to say something.</p>
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="p-4 bg-white border-t border-gray-50">
                <form onSubmit={handleSendMessage} className="relative group">
                    <input
                        type="text"
                        placeholder="Type your message..."
                        className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3.5 pl-5 pr-14 text-sm transition-all focus:border-[#2D8CFF] focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 shadow-inner"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isSending}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2D8CFF] text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-600 hover:scale-105 active:scale-95 disabled:grayscale disabled:opacity-50"
                    >
                        <Send className="h-4 w-4 fill-current" />
                    </button>
                </form>
            </div>
        </div>
    );
}
