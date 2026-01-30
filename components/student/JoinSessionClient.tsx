"use client";

import React, { useState, useEffect, useRef } from 'react';
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
    ChevronLeft,
    Copy,
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SyncedVideoPlayer from '@/components/student/SyncedVideoPlayer';
import AdminMessageTrigger from '@/components/student/AdminMessageTrigger';
import StudentChatPanel from '@/components/student/StudentChatPanel';
import ParticipantCount from '@/components/student/ParticipantCount';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';

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
        source?: 'supabase' | 'google_drive';
        drive_file_id?: string;
    };
}

interface ChatMessage {
    id?: string;
    sender: string;
    message: string;
    type: 'user' | 'admin';
    timestamp: string | Date;
    avatar?: string;
    userId?: string;
}

interface JoinSessionClientProps {
    sessionId: string;
}

export default function JoinSessionClient({ sessionId }: JoinSessionClientProps) {
    const router = useRouter();

    const [session, setSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState('');
    const [userId, setUserId] = useState('');
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState('guest');

    // Guest Auth State
    const [isGuestLogin, setIsGuestLogin] = useState(false);
    const [guestNameInput, setGuestNameInput] = useState('');
    const [guestEmailInput, setGuestEmailInput] = useState('');
    const [guestLoading, setGuestLoading] = useState(false);
    const [showLobby, setShowLobby] = useState(false); // New Lobby State

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

    // Share State
    const [isCopied, setIsCopied] = useState(false);

    // 1. Auth Check & Fetch Session
    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsGuestLogin(true);
                setLoading(false);
                return;
            }

            try {
                // Decode token to get user info locally
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64));
                setUserEmail(payload.email || '');
                setUserId(payload.id || '');
                setUserName(payload.name || payload.email?.split('@')[0] || 'Student');
                setUserRole(payload.role || 'student');

                // Check/Set Guest inputs for Lobby
                if (payload.role === 'guest') {
                    setGuestNameInput(payload.name);
                    setGuestEmailInput(payload.email);
                    setShowLobby(true); // Show Lobby for Guests
                    setLoading(false);
                } else {
                    // Regular user, join immediately
                    await fetchSessionData(token);
                }

            } catch (err) {
                console.error("Invalid token:", err);
                localStorage.removeItem('token');
                setIsGuestLogin(true);
                setLoading(false);
            }
        };

        checkAuthAndFetch();
    }, [sessionId]);

    const handleLobbyJoin = async () => {
        // User confirmed identity in lobby
        setShowLobby(false);
        setLoading(true);
        const token = localStorage.getItem('token');
        if (token) {
            await fetchSessionData(token);
        } else {
            setIsGuestLogin(true);
            setLoading(false);
        }
    };

    const handleChangeIdentity = () => {
        localStorage.removeItem('token');
        setShowLobby(false);
        setIsGuestLogin(true);
        // We can keep the inputs populated or clear them. 
        // Clearing them might be better for "Change Identity"
        setGuestNameInput('');
        setGuestEmailInput('');
    };

    const fetchSessionData = async (token: string) => {
        try {
            const response = await fetch(`/api/student/sessions?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                // console.log('Join Page: checking for session', sessionId);
                // console.log('Available sessions:', data.sessions.map((s: any) => ({ id: s.id, session_id: s.session_id, sessionId: s.sessionId })));

                const found = data.sessions.find((s: any) =>
                    s.sessionId === sessionId ||
                    s.session_id === sessionId ||
                    s._id === sessionId ||
                    s.id === sessionId
                );
                if (found) {
                    setSession(found);
                    setLoading(false);
                } else {
                    console.error('Session not found in list');
                    setError('Session not found or not currently active.');
                    setLoading(false);
                }
            } else {
                // If API returns auth error, force guest login
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('token');
                    setIsGuestLogin(true);
                } else {
                    setError(data.message || 'Failed to load session');
                }
                setLoading(false);
            }
        } catch (err) {
            console.error('Fetch session failed:', err);
            setError('Failed to load session. Please check your connection.');
            setLoading(false);
        }
    };

    const handleGuestLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestNameInput.trim() || !guestEmailInput.trim()) return;

        setGuestLoading(true);
        try {
            const response = await fetch('/api/auth/guest-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: guestNameInput,
                    email: guestEmailInput,
                    sessionId: sessionId
                })
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('token', data.token);
                setGuestLoading(false);
                setIsGuestLogin(false);
                setLoading(true);

                // Update local state
                setUserEmail(data.user.email);
                setUserId(data.user.id);
                setUserName(data.user.name);
                setUserRole('guest');

                // Fetch session
                await fetchSessionData(data.token);
            } else {
                alert(data.message || 'Login failed');
                setGuestLoading(false);
            }
        } catch (err) {
            console.error(err);
            alert('Something went wrong. Please try again.');
            setGuestLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            const link = `${window.location.origin}/join/${sessionId}`;
            const formattedDate = session ? new Date(session.scheduled_start).toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric'
            }) : '';
            const formattedTime = session ? new Date(session.scheduled_start).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit'
            }) : '';

            const message = `🚀 Join Live Session on ZoomStream Sync\n\nTopic: ${session?.title}\nWhen: ${formattedDate} at ${formattedTime}\n\nJoin Here:\n${link}\n\nSee you there!`;

            await navigator.clipboard.writeText(message);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    // Chat Logic
    useEffect(() => {
        if (!session) return;
        const targetSessionId = session.sessionId || session.session_id;

        const fetchHistory = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const response = await fetch(`/api/chat/history/${targetSessionId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
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
                const isDuplicate = prev.some(m =>
                    (m.id && data.id && m.id === data.id) ||
                    (m.message === data.message && m.sender === data.sender && Math.abs(new Date(m.timestamp).getTime() - new Date(data.timestamp).getTime()) < 2000)
                );
                if (isDuplicate) return prev;
                if (!isChatOpenRef.current) {
                    setUnreadCount(c => c + 1);
                }
                return [...prev, data];
            });
        });

        return () => {
            pusher.unsubscribe(`session-${targetSessionId}`);
        };
    }, [session]); // Depend on session only

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
            <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-gray-50">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2D8CFF] border-t-transparent"></div>
                <p className="font-bold text-gray-500 animate-pulse">Connecting to Session...</p>
            </div>
        );
    }

    if (showLobby) {
        return (
            <div className="flex h-[100dvh] flex-col items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                        <Users className="h-7 w-7 text-[#2D8CFF]" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
                    <p className="mt-2 text-sm text-gray-500">You are about to join as:</p>

                    <div className="my-6 rounded-xl bg-gray-50 p-4 border border-gray-100">
                        <p className="text-lg font-bold text-gray-900">{userName}</p>
                        <p className="text-xs text-gray-500">{userEmail}</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleLobbyJoin}
                            className="w-full rounded-xl bg-[#2D8CFF] py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Join Session
                        </button>
                        <button
                            onClick={handleChangeIdentity}
                            className="w-full rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 hover:text-gray-900"
                        >
                            Change Identity
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isGuestLogin) {
        return (
            <div className="flex h-[100dvh] flex-col items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                            <Users className="h-7 w-7 text-[#2D8CFF]" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Join Session</h1>
                        <p className="mt-2 text-sm text-gray-500">Enter your name to join as a guest.</p>
                    </div>

                    <form onSubmit={handleGuestLogin} className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Full Name</label>
                            <input
                                type="text"
                                required
                                value={guestNameInput}
                                onChange={(e) => setGuestNameInput(e.target.value)}
                                placeholder="Student Name"
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-[#2D8CFF] focus:outline-none focus:ring-4 focus:ring-blue-50"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Email Address</label>
                            <input
                                type="email"
                                required
                                value={guestEmailInput}
                                onChange={(e) => setGuestEmailInput(e.target.value)}
                                placeholder="student@example.com"
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-[#2D8CFF] focus:outline-none focus:ring-4 focus:ring-blue-50"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={guestLoading}
                            className="mt-2 w-full rounded-xl bg-[#2D8CFF] py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                        >
                            {guestLoading ? 'Joining...' : 'Join Now'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link href="/login" className="text-xs font-bold text-gray-400 hover:text-[#2D8CFF] transition-colors">
                            Already have an account? Login here
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="flex h-[100dvh] flex-col items-center justify-center p-6 text-center">
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

    return (
        <div className="flex h-[100dvh] flex-col bg-gray-50 overflow-hidden">
            {/* Admin Message Trigger (Logic only) */}
            {session && (
                <AdminMessageTrigger
                    sessionId={session.sessionId || session.session_id}
                    adminMessages={session.adminMessages}
                    playerRef={playerRef}
                />
            )}

            {/* Top Bar */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b bg-white px-4 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <h1 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <Video className="h-4 w-4 text-[#2D8CFF]" />
                        {session.title}
                    </h1>
                    {/* Badge Logic */}
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
            <div className="flex flex-1 flex-col lg:flex-row overflow-hidden relative">
                {/* Video Area */}
                <div className={cn("flex flex-col bg-black transition-all duration-300 w-full lg:w-auto", isChatOpen ? "h-auto md:h-1/2 lg:h-full lg:flex-[0.7]" : "h-auto md:h-full lg:flex-1")}>
                    <div className="flex flex-1 items-center justify-center p-0 md:p-1 lg:p-2 w-full">
                        <div className="w-full h-full lg:h-auto max-w-5xl shadow-2xl shadow-black overflow-hidden rounded-lg">
                            <SyncedVideoPlayer
                                ref={playerRef}
                                sessionId={session.sessionId || session.session_id}
                                videoUrl={session.video_id?.video_url || ''}
                                videoSource={session.video_id?.source}
                                driveFileId={session.video_id?.drive_file_id}
                                thumbnailUrl={session.video_id?.thumbnail_url}
                                scheduledStart={session.scheduled_start}
                                videoDuration={session.video_id?.duration || 0}
                                onStatusChange={(status) => setPlayerStatus(status)}
                            />
                        </div>
                    </div>
                </div>

                {/* Chat Panel - Mobile Overlay or Side Panel */}
                {isChatOpen && (
                    <div className={cn(
                        "w-full lg:w-auto flex flex-col bg-white shadow-xl z-20",
                        "h-1/2 lg:h-full lg:flex-[0.3]",
                        "absolute bottom-0 lg:static lg:relative"
                    )}>
                        <div className="flex-1 relative flex flex-col">
                            <StudentChatPanel
                                sessionId={session.sessionId || session.session_id}
                                currentUserEmail={userEmail}
                                currentUserId={userId}
                                currentUserRole={userRole} // Correctly pass the state derived from token
                                messages={messages}
                                loading={chatLoading}
                            />
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="absolute top-2 right-2 p-2 bg-white rounded-full hover:bg-gray-100 z-30 lg:hidden shadow-md border border-gray-100"
                            >
                                <ChevronLeft className="h-5 w-5 text-black stroke-[3]" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Bar: Action Icons */}
            <div className="flex min-h-[3.5rem] h-auto shrink-0 items-center justify-between border-t bg-white px-2 md:px-4 py-1 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10 overflow-x-auto no-scrollbar">
                <div className="hidden md:flex flex-1"></div>

                <div className="flex w-full md:w-auto items-center justify-center gap-2 md:gap-4">
                    {/* Only show controls if LIVE (or scheduled) and not Ended locally */}
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

                            {/* Share Button */}
                            <ControlButton
                                icon={isCopied ? Check : Copy}
                                label={isCopied ? "Copied!" : "Share Link"}
                                onClick={handleShare}
                                isActive={isCopied}
                                activeColor="bg-green-500 text-white"
                                inactiveColor="bg-gray-100 text-gray-600"
                            />

                            <ControlButton
                                icon={Hand}
                                label="Raise Hand"
                                isActive={isHandRaised}
                                onClick={async () => {
                                    const newState = !isHandRaised;
                                    setIsHandRaised(newState); // Optimistic update
                                    try {
                                        await fetch('/api/student/hand-raise', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                                            },
                                            body: JSON.stringify({
                                                sessionId: session.sessionId || session.session_id,
                                                isRaised: newState
                                            })
                                        });
                                    } catch (err) {
                                        console.error('Hand raise failed', err);
                                        setIsHandRaised(!newState); // Revert on error
                                    }
                                }}
                                activeColor="bg-[#2D8CFF] text-white"
                            />

                            <button
                                onClick={() => setIsChatOpen(!isChatOpen)}
                                className={cn(
                                    "group flex flex-col items-center gap-0.5 rounded-lg p-1 transition-all active:scale-90 relative",
                                    isChatOpen ? "bg-blue-50" : "hover:bg-gray-50"
                                )}
                            >
                                <div className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all relative", // Compact size
                                    isChatOpen ? "bg-[#2D8CFF] text-white shadow-md" : "bg-gray-100 text-gray-600 group-hover:bg-white group-hover:shadow-md"
                                )}>
                                    <Users className="h-4 w-4" />
                                    {unreadCount > 0 && !isChatOpen && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm animate-bounce">
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>
                                <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-tighter whitespace-nowrap",
                                    isChatOpen ? "text-[#2D8CFF]" : "text-gray-400 group-hover:text-gray-600"
                                )}>Chat</span>
                            </button>
                        </>
                    )}

                    <Link
                        href={userRole === 'admin' ? `/admin/sessions/${sessionId}` : '/student'}
                        className="ml-2 md:ml-4 flex flex-col items-center justify-center gap-0.5 w-12 rounded-lg p-1 text-[9px] font-bold text-red-500 hover:bg-red-50 transition-all active:scale-95 whitespace-nowrap"
                        title={isGuestLogin ? 'Exit Session' : 'Leave Session'}
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 border border-red-100">
                            <LogOut className="h-4 w-4 text-red-500" />
                        </div>
                        <span className="uppercase tracking-tighter">{isGuestLogin ? 'Exit' : 'Leave'}</span>
                    </Link>
                </div>

                <div className="flex flex-1 justify-end md:justify-end pl-2">
                    <button
                        onClick={async () => {
                            if (!document.fullscreenElement) {
                                await document.documentElement.requestFullscreen();
                            } else {
                                if (document.exitFullscreen) await document.exitFullscreen();
                            }
                        }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors"
                    >
                        {!!document.fullscreenElement ? <Minimize2 className="h-6 w-6 text-gray-600" /> : <Maximize2 className="h-6 w-6 text-gray-600" />}
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
            className="group flex flex-col items-center gap-0.5 rounded-lg p-1 transition-all active:scale-90"
        >
            <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all group-hover:shadow-md",
                isActive ? activeColor : inactiveColor,
                !isActive && "group-hover:bg-white"
            )}>
                <Icon className="h-4 w-4" />
            </div>
            <span className={cn(
                "text-[9px] font-bold uppercase tracking-tighter",
                isActive ? "text-[#2D8CFF]" : "text-gray-400 group-hover:text-gray-600"
            )}>{label}</span>
        </button>
    );
}
