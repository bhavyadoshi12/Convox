'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPusherClient } from '@/lib/pusher-client';

interface Session {
    id: string;
    session_id: string;
    title: string;
    scheduled_start: string;
    status: 'scheduled' | 'live' | 'ended';
    video_id: {
        title: string;
        thumbnail_url: string;
        duration: number;
    };
}

export default function StudentDashboard() {
    const router = useRouter();
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'live' | 'scheduled'>('all');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Utility: Get virtual status based on time (Central Control)
    const getVirtualStatus = useCallback((session: Session) => {
        if (session.status === 'ended') return 'ended';

        const now = currentTime.getTime();
        const start = new Date(session.scheduled_start).getTime();
        const duration = (session.video_id?.duration || 0) * 1000;
        const end = start + duration;

        if (now < start) return 'scheduled';
        if (now >= end) return 'ended';
        return 'live';
    }, [currentTime]);

    // Derived Counts (Memoized for performance)
    const counts = useMemo(() => {
        const stats = { all: allSessions.length, live: 0, scheduled: 0 };
        allSessions.forEach(s => {
            const status = getVirtualStatus(s);
            if (status === 'live') stats.live++;
            if (status === 'scheduled') stats.scheduled++;
        });
        return stats;
    }, [allSessions, getVirtualStatus]);

    // Update local status of filtered sessions
    const sessionList = useMemo(() => {
        return (filter === 'all' ? allSessions : allSessions.filter(s => getVirtualStatus(s) === filter));
    }, [allSessions, filter, getVirtualStatus]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        fetchSessions();

        // Real-time Updates (Pusher)
        const pusher = getPusherClient();
        const channel = pusher.subscribe('sessions');

        const handleDelete = (data: { id: string, uuid: string }) => {
            setAllSessions(prev => prev.filter(s => s.session_id !== data.id && s.id !== data.uuid));
        };

        const handleUpdate = (updatedSession: Session) => {
            setAllSessions(prev => prev.map(s =>
                (s.id === updatedSession.id || s.session_id === updatedSession.session_id)
                    ? updatedSession
                    : s
            ));
        };

        const handleCreate = (newSession: Session) => {
            setAllSessions(prev => {
                const results = prev.filter(s => s.id !== newSession.id);
                return [newSession, ...results];
            });
        };

        channel.bind('session-deleted', handleDelete);
        channel.bind('session-updated', handleUpdate);
        channel.bind('session-created', handleCreate);

        // Current Time Ticker
        const ticker = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => {
            channel.unbind('session-deleted', handleDelete);
            channel.unbind('session-updated', handleUpdate);
            channel.unbind('session-created', handleCreate);
            pusher.unsubscribe('sessions');
            clearInterval(ticker);
        };
    }, [router]);

    // Filter Logic is now handled by sessionList memo
    // No need for separate useEffect for filteredSessions

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem('token');
            // Always fetch ALL to get accurate counts
            const response = await fetch('/api/student/sessions?limit=100', {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setAllSessions(data.sessions || []);
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    // ... helper functions (getStatusColor, formatDate) same as before ... 
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'live':
                return 'bg-green-500';
            case 'scheduled':
                return 'bg-blue-500';
            case 'ended':
                return 'bg-gray-500';
            default:
                return 'bg-gray-400';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl animate-pulse text-blue-600 font-bold">Loading Your Dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow z-10 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        Student Dashboard
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Stats Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">All Sessions</p>
                        <p className="text-3xl font-black">{counts.all}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
                        <p className="text-green-100 text-xs font-bold uppercase tracking-wider">Live Now</p>
                        <p className="text-3xl font-black">{counts.live}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Upcoming</p>
                        <p className="text-3xl font-black text-gray-900">{counts.scheduled}</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        All Sessions
                    </button>
                    <button
                        onClick={() => setFilter('live')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${filter === 'live' ? 'bg-green-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Live Now
                        {counts.live > 0 && <span className="bg-white text-green-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{counts.live}</span>}
                    </button>
                    <button
                        onClick={() => setFilter('scheduled')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'scheduled' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Upcoming
                    </button>
                </div>

                {/* Sessions Grid */}
                {sessionList.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-400 font-medium">No sessions found in this category.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessionList.map((session) => (
                            <SessionCard key={session.id} session={session} virtualStatus={getVirtualStatus(session)} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function SessionCard({ session, virtualStatus }: { session: Session; virtualStatus: 'scheduled' | 'live' | 'ended' }) {
    const calculateTimeLeft = useCallback(() => {
        const now = new Date().getTime();
        const start = new Date(session.scheduled_start).getTime();
        const diff = start - now;

        if (diff <= 0) return null;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);

        return parts.join(' ');
    }, [session.scheduled_start]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    const [localStatus, setLocalStatus] = useState(virtualStatus);

    // Sync local status when parent recalculates
    useEffect(() => {
        setLocalStatus(virtualStatus);
    }, [virtualStatus]);

    useEffect(() => {
        if (localStatus !== 'scheduled') return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const start = new Date(session.scheduled_start).getTime();
            const duration = (session.video_id?.duration || 0) * 1000;
            const end = start + duration;

            if (now >= end) {
                setLocalStatus('ended');
                return;
            }

            if (now >= start) {
                setLocalStatus('live');
                return;
            }

            // Update countdown
            setTimeLeft(calculateTimeLeft());
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [session.scheduled_start, session.status, session.video_id?.duration, localStatus, calculateTimeLeft]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'live': return 'bg-green-500';
            case 'scheduled': return 'bg-blue-500';
            case 'ended': return 'bg-gray-500';
            default: return 'bg-gray-400';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div
            className="group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
            {/* Thumbnail */}
            <div className="relative h-48 bg-gray-200 overflow-hidden">
                {session.video_id?.thumbnail_url ? (
                    <img
                        src={session.video_id.thumbnail_url}
                        alt={session.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Thumbnail
                    </div>
                )}

                {/* Status Badge */}
                <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-white text-xs font-bold tracking-wider shadow-sm z-10 ${getStatusColor(localStatus)}`}>
                    {localStatus.toUpperCase()}
                </div>

                {/* Countdown Overlay - ALWAYS VISIBLE for Scheduled */}
                {localStatus === 'scheduled' && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="text-center bg-black/60 p-3 rounded-xl border border-white/10 shadow-2xl">
                            <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest mb-1">Starts In</p>
                            <p className="text-white text-xl font-bold font-mono tracking-tight tabular-nums">
                                {timeLeft || <span className="animate-pulse">Loading...</span>}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2 truncate group-hover:text-[#2D8CFF] transition-colors">
                    {session.title}
                </h3>
                <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    {session.video_id?.title || 'Unknown Video'}
                </p>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    {formatDate(session.scheduled_start)}
                </p>

                {/* Join Button */}
                {localStatus === 'live' ? (
                    <Link
                        href={`/join/${session.session_id}`}
                        className="block w-full text-center px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold shadow-lg shadow-green-200 transition-all hover:shadow-xl active:scale-95"
                    >
                        Join Live Session
                    </Link>
                ) : localStatus === 'scheduled' ? (
                    <button
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed border border-gray-200"
                    >
                        Wait for Start
                    </button>
                ) : (
                    <Link
                        href={`/join/${session.session_id}`}
                        className="block w-full text-center px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black font-bold shadow-lg transition-all hover:shadow-xl active:scale-95"
                    >
                        Watch Replay
                    </Link>
                )}
            </div>
        </div>
    );
}
