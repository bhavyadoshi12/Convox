"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Calendar,
    Search,
    Plus,
    Activity,
    History,
    MoreVertical,
    Play,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Video
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { SessionCardSkeleton } from '@/components/ui/Skeletons';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const SessionModal = dynamic(() => import('@/components/admin/SessionModal'));
const SessionCard = dynamic(() => import('@/components/admin/SessionCard'), { loading: () => <SessionCardSkeleton /> });

interface SessionData {
    id: string;
    sessionId: string;
    title: string;
    status: 'scheduled' | 'live' | 'ended';
    scheduled_start: string;
    video_id: {
        id: string;
        title: string;
        thumbnail_url: string;
    };
    createdBy: {
        id: string;
        name: string;
    };
}

const statusTabs = [
    { id: 'all', label: 'All Sessions', icon: Calendar },
    { id: 'scheduled', label: 'Scheduled', icon: Clock },
    { id: 'live', label: 'Live', icon: Activity },
    { id: 'ended', label: 'Ended', icon: History },
];

export default function SessionsPage() {
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    const fetchSessions = useCallback(async (page = 1, status = 'all') => {
        setLoading(true);
        try {
            const statusParam = status !== 'all' ? `&status=${status}` : '';
            const response = await fetch(`/api/admin/sessions?page=${page}&limit=${pagination.limit}${statusParam}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setSessions(data.sessions);
                setPagination(prev => ({
                    ...prev,
                    page: data.pagination.page,
                    total: data.pagination.total,
                    totalPages: data.pagination.totalPages
                }));
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    }, [pagination.limit]);

    useEffect(() => {
        fetchSessions(1, activeTab);
    }, [activeTab, fetchSessions]);

    const deleteSession = useCallback(async (id: string, status: string) => {
        // Allow deleting any session regardless of status
        if (!confirm('Are you sure you want to delete this session?')) return;

        try {
            const response = await fetch(`/api/admin/sessions/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                fetchSessions(pagination.page, activeTab);
            } else {
                alert('Failed to delete session: ' + data.message);
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    }, [pagination.page, activeTab, fetchSessions]);

    const handleCreateSession = () => {
        setEditingSessionId(null);
        setIsModalOpen(true);
    };

    const handleEditSession = (session: SessionData) => {
        setEditingSessionId(session.id); // Use ID or SessionID depending on what SessionForm expects. SessionForm uses "sessionId" prop but internal logic handles both. unique ID is safer.
        setIsModalOpen(true);
    };

    const filteredSessions = useMemo(() => {
        return sessions.filter(session =>
            session.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [sessions, searchQuery]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
                    <p className="text-gray-500">Schedule and monitor your live stream sessions</p>
                </div>
                <button
                    onClick={handleCreateSession}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2D8CFF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <Plus className="h-4 w-4" />
                    Create Session
                </button>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-1 self-start rounded-xl bg-gray-100 p-1">
                    {statusTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                                    activeTab === tab.id
                                        ? "bg-white text-[#2D8CFF] shadow-sm"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="relative w-full xl:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by title..."
                        className="w-full rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Sessions Content */}
            {loading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <SessionCardSkeleton key={i} />
                    ))}
                </div>
            ) : filteredSessions.length > 0 ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredSessions.map((session) => (
                            <SessionCard
                                key={session.id}
                                session={session as any}
                                onDelete={deleteSession}
                                onEdit={handleEditSession}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                            <p className="text-sm text-gray-500">
                                Showing <span className="font-medium text-gray-900">{filteredSessions.length}</span> of <span className="font-medium text-gray-900">{pagination.total}</span> sessions
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={pagination.page <= 1}
                                    onClick={() => fetchSessions(pagination.page - 1, activeTab)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <div className="flex gap-1">
                                    {[...Array(pagination.totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => fetchSessions(i + 1, activeTab)}
                                            className={cn(
                                                "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                                                pagination.page === i + 1
                                                    ? "border-[#2D8CFF] bg-[#2D8CFF] text-white"
                                                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                            )}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => fetchSessions(pagination.page + 1, activeTab)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white py-24 shadow-sm">
                    <div className="mb-6 rounded-full bg-gray-50 p-6">
                        <Calendar className="h-12 w-12 text-gray-300" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-900">No sessions found</h3>
                    <p className="mb-8 max-w-sm text-center text-gray-500">
                        {searchQuery
                            ? `We couldn't find any sessions matching "${searchQuery}".`
                            : activeTab === 'all'
                                ? "You haven't created any sessions yet. Get started by scheduling your first stream."
                                : `No ${activeTab} sessions found at the moment.`
                        }
                    </p>
                    <button
                        onClick={handleCreateSession}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2D8CFF] px-6 py-3 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        Schedule New Session
                    </button>
                </div>
            )}

            {/* Session Modal (Create & Edit) */}
            <SessionModal
                isOpen={isModalOpen}
                sessionId={editingSessionId}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => fetchSessions(1, activeTab)}
            />
        </div>
    );
}
