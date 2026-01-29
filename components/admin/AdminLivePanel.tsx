"use client";

import React, { useState, useEffect, useRef } from 'react';
import StudentChatPanel from '@/components/student/StudentChatPanel';
import ParticipantCount from '@/components/student/ParticipantCount';
import { getPusherClient } from '@/lib/pusher-client';

interface AdminLivePanelProps {
    sessionId: string;
}

export default function AdminLivePanel({ sessionId }: AdminLivePanelProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [chatLoading, setChatLoading] = useState(true);
    const [userEmail, setUserEmail] = useState('');
    const [userId, setUserId] = useState('');
    const [userRole, setUserRole] = useState('admin');

    useEffect(() => {
        // Decode Token for User Info
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64));
                setUserEmail(payload.email || '');
                setUserId(payload.id || '');
                setUserRole(payload.role || 'admin');
            } catch (e) {
                console.error("Invalid token:", e);
            }
        }
    }, []);

    // Fetch Initial Messages
    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/chat/history/${sessionId}`);
            const data = await res.json();
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        if (!sessionId) return;

        fetchMessages();

        const pusher = getPusherClient();
        const channel = pusher.subscribe(`session-${sessionId}`);

        channel.bind('message-added', (newMessage: any) => {
            setMessages((prev) => {
                if (prev.some(msg => msg.id === newMessage.id)) return prev;
                return [...prev, newMessage];
            });
        });

        channel.bind('message-deleted', (data: { messageId: string }) => {
            setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
        });

        channel.bind('chat-cleared', () => {
            setMessages([]);
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`session-${sessionId}`);
        };
    }, [sessionId]);


    return (
        <div className="flex flex-col h-[600px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Live Control</h3>
                <ParticipantCount sessionId={sessionId} />
            </div>

            <div className="flex-1 relative">
                <StudentChatPanel
                    sessionId={sessionId}
                    currentUserEmail={userEmail}
                    currentUserId={userId}
                    currentUserRole={userRole}
                    messages={messages}
                    loading={chatLoading}
                />
            </div>
        </div>
    );
}
