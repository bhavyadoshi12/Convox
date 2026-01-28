"use client";

import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { getPusherClient } from '@/lib/pusher-client';

interface ParticipantCountProps {
    sessionId: string;
}

export default function ParticipantCount({ sessionId }: ParticipantCountProps) {
    const [count, setCount] = useState(1);

    useEffect(() => {
        const pusher = getPusherClient();
        const channel = pusher.subscribe(`presence-session-${sessionId}`);

        channel.bind('pusher:subscription_succeeded', (members: any) => {
            setCount(members.count);
        });

        channel.bind('pusher:member_added', () => {
            setCount(prev => prev + 1);
        });

        channel.bind('pusher:member_removed', () => {
            setCount(prev => Math.max(1, prev - 1));
        });

        return () => {
            pusher.unsubscribe(`presence-session-${sessionId}`);
        };
    }, [sessionId]);

    return (
        <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500 shadow-sm transition-all hover:bg-gray-200">
            <Users className="h-3.5 w-3.5 text-[#2D8CFF]" />
            <span>{count}</span>
        </div>
    );
}
