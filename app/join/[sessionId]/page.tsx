"use client";

import React, { useState, useEffect } from 'react';
import {
    Users,
    Mic,
    Video,
    Monitor,
    Hand,
    LogOut,
    Maximize2,
    Minimize2,
    ShieldCheck,
    ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SyncedVideoPlayer from '@/components/student/SyncedVideoPlayer';
import AdminMessageTrigger from '@/components/student/AdminMessageTrigger';
import StudentChatPanel from '@/components/student/StudentChatPanel';
import ParticipantCount from '@/components/student/ParticipantCount';
import Link from 'next/link';

interface SessionData {
    _id: string;
    sessionId: string;
    session_id: string; // Add snake_case support
    title: string;
    status: string;
    scheduled_start: string;
    adminMessages: any[];
    video_id: {
        video_url: string;
        thumbnail_url: string;
        duration: number;
    };
}

import { useParams } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';

interface ChatMessage {
    id?: string;
    sender: string;
    message: string;
    type: 'user' | 'admin';
    timestamp: string | Date;
    avatar?: string;
    userId?: string;
}

export default function JoinSessionPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;

    const [session, setSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState('');
    const [userId, setUserId] = useState('');

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [chatLoading, setChatLoading] = useState(true);

    const [isMicOn, setIsMicOn] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [playerStatus, setPlayerStatus] = useState<string>('countdown'); // Local player state
    const playerRef = React.useRef<any>(null);

    // Fetch Session
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    setUserEmail(payload.email || 'Student');
                    setUserId(payload.id || '');
                }

                const response = await fetch(`/api/student/sessions?limit=100`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();

                if (data.success) {
                    const found = data.sessions.find((s: any) =>
                        s.sessionId === sessionId ||
                        s.session_id === sessionId ||
                        s._id === sessionId
                    );
                    if (found) {
                        setSession(found);
                    } else {
                        setError('Session not found or not currently active.');
                    }
                }
            } catch (err) {
                console.error('Fetch session failed:', err);
                setError('Failed to load session. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [sessionId]);

    // Chat Logic: Fetch History & Subscribe
    useEffect(() => {
        if (!session) return;

        // Use the SLUG if available for channel subscription to match server trigger
        const targetSessionId = session.sessionId || session.session_id;

        const fetchHistory = async () => {
            try {
                const response = await fetch(`/api/chat/history/${targetSessionId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await response.json();
                if (data.success) {
                    setMessages(data.messages);
                }
            } catch (err) {
                console.error('History fetch error:', err);
            } finally {
                setChatLoading(false);
            }
        };

        fetchHistory();

        const pusher = getPusherClient();
        const channel = pusher.subscribe(`session-${targetSessionId}`);

        channel.bind('new-message', (data: ChatMessage) => {
            setMessages(prev => {
                // Deduplication: Check if ID matches OR (content + sender + time proximity) matches
                const isDuplicate = prev.some(m =>
                    (m.id && data.id && m.id === data.id) ||
                    (m.message === data.message && m.sender === data.sender && Math.abs(new Date(m.timestamp).getTime() - new Date(data.timestamp).getTime()) < 2000)
                );

                if (isDuplicate) return prev;

                // If chat is closed, increment unread
                if (!isChatOpen) {
                    setUnreadCount(c => c + 1);
                }

                return [...prev, data];
            });
        });

        return () => {
            pusher.unsubscribe(`session-${targetSessionId}`);
        };
    }, [session, isChatOpen]); // Depend on isChatOpen to capture current state for unread logic? 
    // Actually, depending on isChatOpen in useEffect will resubscribe on toggle. 
    // Better to use a ref for isChatOpen or functional update for unreadCount. 
    // BUT setMessages functional update can't see isChatOpen's current value easily without closure.
    // WORKAROUND: Use a separate useEffect/ref for unread logic or accept resubscribe (low cost).
    // Let's use a ref for isChatOpen to avoid resubscribing.

    // Ref for chat open status to use inside Pusher callback without re-binding
    const isChatOpenRef = React.useRef(isChatOpen);
    useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);

    useEffect(() => {
        if (isChatOpen) {
            setUnreadCount(0);
        }
    }, [isChatOpen]);

    // Auto-close chat when stream ends
    useEffect(() => {
        if (playerStatus === 'ended' || playerStatus === 'replay') {
            setIsChatOpen(false);
        }
    }, [playerStatus]);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 bg-gray-50">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2D8CFF] border-t-transparent"></div>
                <p className="font-bold text-gray-500 animate-pulse">Connecting to Live Server...</p>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center p-6 text-center">
                <div className="mb-6 rounded-full bg-red-100 p-6 text-red-600">
                    <ShieldCheck className="h-12 w-12" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h2>
                <p className="mb-8 max-w-sm text-gray-500">{error || 'Something went wrong.'}</p>
                <Link href="/student" className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-bold text-white transition-all hover:bg-black active:scale-95">
                    <ChevronLeft className="h-4 w-4" /> Go Back Home
                </Link>
            </div>
        );
    }

    // Fetch Session... (no change)

    // ... (rest of code)

    return (
        <div className="flex h-[calc(100vh-64px)] flex-col bg-gray-50 overflow-hidden">
            {/* Admin Message Trigger (Logic only) */}
            {session && (
                <AdminMessageTrigger
                    sessionId={session.sessionId || session.session_id}
                    adminMessages={session.adminMessages}
                    playerRef={playerRef}
                />
            )}

            {/* Top Bar */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <h1 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <Video className="h-4 w-4 text-[#2D8CFF]" />
                        {session.title}
                    </h1>
                    {/* Badge Logic: Check Player Status First */}
                    {(playerStatus === 'playing' || (session.status === 'live' && playerStatus !== 'ended' && playerStatus !== 'replay')) && (
                        <span className="inline-flex items-center gap-1.5 rounded bg-red-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow-sm">
                            <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse"></span>
                            Live
                        </span>
                    )}
                    {(playerStatus === 'ended' || playerStatus === 'replay' || session.status === 'ended' || session.status === 'replay') && (
                        <span className="inline-flex items-center gap-1.5 rounded bg-gray-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow-sm">
                            Recorded
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <ParticipantCount sessionId={session.sessionId || session.session_id} />
                </div>
            </div>

            {/* Main Container: Video + Chat */}
            <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
                {/* Video Area (Flex grows if chat is closed) */}
                <div className={cn("flex flex-col bg-black transition-all duration-300", isChatOpen ? "flex-[0.7]" : "flex-1")}>
                    <div className="flex flex-1 items-center justify-center p-0 md:p-4 lg:p-8">
                        <div className="w-full max-w-5xl shadow-2xl shadow-black overflow-hidden rounded-lg">
                            <SyncedVideoPlayer
                                ref={playerRef}
                                sessionId={session.sessionId || session.session_id}
                                videoUrl={session.video_id?.video_url || ''}
                                thumbnailUrl={session.video_id?.thumbnail_url}
                                scheduledStart={session.scheduled_start}
                                videoDuration={session.video_id?.duration || 0}
                                onStatusChange={(status) => setPlayerStatus(status)}
                            />
                        </div>
                    </div>
                </div>

                {/* Chat Panel */}
                {isChatOpen && (
                    <div className="w-full shrink-0 flex-[0.3] lg:w-auto h-96 lg:h-full relative">
                        <StudentChatPanel
                            sessionId={session.sessionId || session.session_id}
                            currentUserEmail={userEmail}
                            currentUserId={userId}
                            messages={messages}
                            loading={chatLoading}
                        />
                        <button
                            onClick={() => setIsChatOpen(false)}
                            className="absolute top-2 right-2 p-1 bg-gray-200 rounded-full hover:bg-gray-300 z-20 md:hidden"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Bar: Action Icons */}
            <div className="flex h-16 shrink-0 items-center justify-between border-t bg-white px-8 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10">
                <div className="flex-1"></div>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* Only show controls if LIVE and not Ended locally */}
                    {(session.status !== 'ended' && session.status !== 'replay' && playerStatus !== 'ended' && playerStatus !== 'replay') && (
                        <>
                            <ControlButton
                                icon={Mic}
                                label={isMicOn ? "Mute" : "Unmute"}
                                isActive={isMicOn}
                                onClick={() => setIsMicOn(!isMicOn)}
                                activeColor="bg-gray-100 text-gray-900"
                                inactiveColor="bg-red-50 text-red-500"
                            />
                            <ControlButton
                                icon={Video}
                                label={isVideoOn ? "Stop Video" : "Start Video"}
                                isActive={isVideoOn}
                                onClick={() => setIsVideoOn(!isVideoOn)}
                                activeColor="bg-gray-100 text-gray-900"
                                inactiveColor="bg-red-50 text-red-500"
                            />
                            <ControlButton icon={Monitor} label="Share" onClick={() => { }} />
                            <ControlButton
                                icon={Hand}
                                label="Raise Hand"
                                isActive={isHandRaised}
                                onClick={() => setIsHandRaised(!isHandRaised)}
                                activeColor="bg-[#2D8CFF] text-white"
                            />

                            <button
                                onClick={() => setIsChatOpen(!isChatOpen)}
                                className={cn(
                                    "group flex flex-col items-center gap-1 rounded-xl p-2 transition-all active:scale-90 relative",
                                    isChatOpen ? "bg-blue-50" : "hover:bg-gray-50"
                                )}
                            >
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all relative",
                                    isChatOpen ? "bg-[#2D8CFF] text-white shadow-md" : "bg-gray-100 text-gray-600 group-hover:bg-white group-hover:shadow-md"
                                )}>
                                    <Users className="h-5 w-5" />
                                    {unreadCount > 0 && !isChatOpen && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-bounce">
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-tighter",
                                    isChatOpen ? "text-[#2D8CFF]" : "text-gray-400 group-hover:text-gray-600"
                                )}>Chat</span>
                            </button>
                        </>
                    )}

                    <Link
                        href="/student"
                        className="ml-4 rounded-lg bg-red-500 px-5 py-2 text-xs font-bold text-white transition-all hover:bg-red-600 active:scale-95"
                    >
                        Leave
                    </Link>
                </div>

                <div className="flex flex-1 justify-end">
                    <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
                        <Maximize2 className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

interface ControlButtonProps {
    icon: any;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    activeColor?: string;
    inactiveColor?: string;
}

function ControlButton({
    icon: Icon,
    label,
    isActive = false,
    onClick,
    activeColor = "bg-[#2D8CFF] text-white",
    inactiveColor = "bg-gray-100 text-gray-600"
}: ControlButtonProps) {
    return (
        <button
            onClick={onClick}
            className="group flex flex-col items-center gap-1 rounded-xl p-2 transition-all active:scale-90"
        >
            <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-all group-hover:shadow-md",
                isActive ? activeColor : inactiveColor,
                !isActive && "group-hover:bg-white"
            )}>
                <Icon className="h-5 w-5" />
            </div>
            <span className={cn(
                "text-[10px] font-bold uppercase tracking-tighter",
                isActive ? "text-[#2D8CFF]" : "text-gray-400 group-hover:text-gray-600"
            )}>{label}</span>
        </button>
    );
}
