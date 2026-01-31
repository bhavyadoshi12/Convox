"use client";

import React, { memo, useMemo } from 'react';
import { Calendar, Clock, Video, Activity, Play, Edit, Trash2, MoreVertical, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import ParticipantCount from '@/components/student/ParticipantCount';

interface SessionData {
    id: string;
    sessionId: string;
    session_id?: string;
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

interface SessionCardProps {
    session: SessionData;
    onDelete: (id: string, status: string) => void;
    onEdit?: (session: SessionData) => void;
}

const SessionCard = ({ session, onDelete, onEdit }: SessionCardProps) => {
    const formattedDate = useMemo(() => {
        return new Date(session.scheduled_start).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }, [session.scheduled_start]);

    const formattedTime = useMemo(() => {
        return new Date(session.scheduled_start).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }, [session.scheduled_start]);

    return (
        <div className="group relative flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-[#2D8CFF] hover:shadow-md">
            {/* Status Badge */}
            <div className="mb-4 flex items-center justify-between">
                <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                    session.status === 'live' ? "bg-red-100 text-red-700 animate-pulse" :
                        session.status === 'scheduled' ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-600"
                )}>
                    {session.status === 'live' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-600"></span>}
                    {session.status}
                </span>

                <div className="flex items-center gap-1">
                    {/* Participant Count for Admin */}
                    <div className="mr-2">
                        <ParticipantCount sessionId={session.sessionId || session.session_id || session.id} />
                    </div>

                    <button
                        onClick={() => onEdit && onEdit(session)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                    >
                        <Edit className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDelete(session.id, session.status)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <h3 className="mb-4 line-clamp-1 text-lg font-bold text-gray-900 group-hover:text-[#2D8CFF] transition-colors">
                {session.title}
            </h3>

            <div className="mb-4 flex items-center gap-3 text-sm text-gray-500">
                <div className="relative flex h-10 w-16 items-center justify-center overflow-hidden rounded bg-gray-50 border border-gray-100">
                    {session.video_id?.thumbnail_url ? (
                        <Image
                            src={session.video_id.thumbnail_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="64px"
                        />
                    ) : (
                        <Video className="h-5 w-5 text-gray-300" />
                    )}
                </div>
                <p className="line-clamp-2 text-xs font-medium">{session.video_id?.title || 'No video assigned'}</p>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4 text-xs font-semibold text-gray-500">
                <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-[#2D8CFF]" />
                    {formattedDate}
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[#2D8CFF]" />
                    {formattedTime}
                </div>
            </div>

            <div className="mt-6 flex gap-3">
                <Link
                    href={
                        session.status === 'live'
                            ? `/join/${session.sessionId || session.id}`
                            : `/admin/sessions/${session.sessionId || session.id}`
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-xs font-bold text-white transition-all hover:bg-black active:scale-95"
                >
                    <Play className="h-3 w-3" />
                    {session.status === 'live' ? 'View Live' : 'Manage Session'}
                </Link>
                <button
                    onClick={() => {
                        const link = `${window.location.origin}/join/${session.sessionId || session.id}`;
                        // Simplified format for better compatibility and "tap to link" behavior
                        const message = `🚀 Join Live Session on Convox\n\nTopic: ${session.title}\nWhen: ${formattedDate} at ${formattedTime}\n\nJoin Here:\n${link}\n\nSee you there!`;

                        navigator.clipboard.writeText(message);
                        alert("Invitation copied to clipboard!");
                    }}
                    className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:bg-gray-100"
                    title="Copy Join Link"
                >
                    <Copy className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default memo(SessionCard);
