"use client";

import { useEffect, useState } from 'react';
import { Video, Calendar, Users, Activity, Play } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface DashboardStats {
    totalVideos: number;
    liveSessions: number;
    scheduledSessions: number;
    totalStudents: number;
}

interface SessionBrief {
    id: string;
    sessionId: string;
    title: string;
    status: string;
    scheduled_start: string;
    video_id: {
        title: string;
        thumbnail_url: string;
    };
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentSessions, setRecentSessions] = useState<SessionBrief[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/admin/stats', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    setStats(data.stats);
                    setRecentSessions(data.recentSessions);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2D8CFF] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">Overview of your streaming platform</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Videos"
                    value={stats?.totalVideos || 0}
                    icon={Video}
                    color="bg-blue-500"
                />
                <StatCard
                    label="Live Sessions"
                    value={stats?.liveSessions || 0}
                    icon={Activity}
                    color="bg-red-500"
                />
                <StatCard
                    label="Upcoming Sessions"
                    value={stats?.scheduledSessions || 0}
                    icon={Calendar}
                    color="bg-green-500"
                />
                <StatCard
                    label="Total Students"
                    value={stats?.totalStudents || 0}
                    icon={Users}
                    color="bg-purple-500"
                />
            </div>

            {/* Recent Activity Section */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Upcoming & Recent Sessions</h2>
                    <Link href="/admin/sessions" className="text-sm font-medium text-[#2D8CFF] hover:underline">
                        View all
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                            <tr>
                                <th className="px-6 py-3">Session</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Start Time</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentSessions.length > 0 ? (
                                recentSessions.map((session) => (
                                    <tr key={session.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-16 relative overflow-hidden rounded bg-gray-200">
                                                    {session.video_id?.thumbnail_url ? (
                                                        <Image
                                                            src={session.video_id.thumbnail_url}
                                                            alt={session.title}
                                                            fill
                                                            className="object-cover"
                                                            sizes="64px"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center bg-gray-100">
                                                            <Video className="h-4 w-4 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900">{session.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                session.status === 'live' ? "bg-red-100 text-red-800" :
                                                    session.status === 'scheduled' ? "bg-green-100 text-green-800" :
                                                        "bg-gray-100 text-gray-800"
                                            )}>
                                                {session.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(session.scheduled_start).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={`/admin/sessions/${session.sessionId || session.id}`} className="inline-flex items-center text-[#2D8CFF] hover:underline">
                                                <Play className="mr-1 h-3 w-3" /> Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                                        No sessions found. Create one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
