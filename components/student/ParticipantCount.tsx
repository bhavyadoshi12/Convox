"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Users, ChevronDown, UserCircle, Hand } from 'lucide-react';
import { getPusherClient } from '@/lib/pusher-client';
import { cn } from '@/lib/utils';

interface ParticipantCountProps {
    sessionId: string;
}

interface Member {
    id: string;
    info: {
        name: string;
        email: string;
        role: string;
    };
    isHandRaised?: boolean;
}

export default function ParticipantCount({ sessionId }: ParticipantCountProps) {
    // const [count, setCount] = useState(0); // Removed separate count state
    const [members, setMembers] = useState<Member[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Derived count from members length
    const BASE_COUNT = 733;
    const count = BASE_COUNT + members.length;

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!sessionId) return;

        const pusher = getPusherClient();
        const channelName = `presence-session-${sessionId}`;
        const channel = pusher.subscribe(channelName);

        channel.bind('pusher:subscription_succeeded', (data: any) => {
            // Transform members object to array and filter out admins
            const memberList: Member[] = [];
            if (data.members) {
                Object.keys(data.members).forEach(id => {
                    const memberInfo = data.members[id];
                    if (memberInfo.role !== 'admin') {
                        memberList.push({
                            id,
                            info: memberInfo
                        });
                    }
                });
            }
            setMembers(memberList);
        });

        channel.bind('pusher:member_added', (member: Member) => {
            if (member.info.role !== 'admin') {
                setMembers(prev => {
                    // Avoid duplicates just in case
                    if (prev.some(m => m.id === member.id)) return prev;
                    return [...prev, member];
                });
            }
        });

        channel.bind('pusher:member_removed', (member: Member) => {
            setMembers(prev => prev.filter(m => m.id !== member.id));
        });

        // Listen for Hand Raises (on the public session channel, or just reuse logic if triggered on presence)
        // Since API triggers on `session-${sessionId}`, we subscribe to it.
        const eventChannel = pusher.subscribe(`session-${sessionId}`);
        eventChannel.bind('client-hand-update', (data: { userId: string, isRaised: boolean }) => {
            setMembers(prev => prev.map(m => {
                if (m.id === data.userId) {
                    return { ...m, isHandRaised: data.isRaised };
                }
                return m;
            }));
        });

        return () => {
            channel.unbind_all();
            eventChannel.unbind_all();
            pusher.unsubscribe(channelName);
            pusher.unsubscribe(`session-${sessionId}`);
        };
    }, [sessionId]);

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-all border",
                    isOpen ? "bg-blue-50 border-blue-200 text-[#2D8CFF]" : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                )}
            >
                <Users className="h-3.5 w-3.5" />
                <span>{count}</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
            </button>

            {/* Popover List */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-xl bg-white p-1 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-2 border-b border-gray-100">
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                            Participants ({count})
                        </h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto px-1 py-1 custom-scrollbar">
                        {members.length === 0 ? (
                            <div className="py-4 text-center text-xs text-gray-400 italic">
                                Loading participants...
                            </div>
                        ) : (
                            members.map((member) => (
                                <div key={member.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors">
                                    <div className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm",
                                        member.info.role === 'admin' ? "bg-purple-500" :
                                            member.info.role === 'guest' ? "bg-orange-400" : "bg-blue-500"
                                    )}>
                                        {member.info.name ? member.info.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate text-xs font-bold text-gray-900 flex items-center gap-1">
                                            {member.info.name || 'Anonymous'}
                                            {member.isHandRaised && <Hand className="h-3 w-3 text-orange-500 animate-pulse" />}
                                        </p>
                                        <p className="truncate text-[10px] text-gray-500 capitalize">
                                            {member.info.role}
                                        </p>
                                    </div>
                                    <div className={cn("h-2 w-2 rounded-full shadow-sm animate-pulse", member.isHandRaised ? "bg-orange-500" : "bg-green-500")} title={member.isHandRaised ? "Hand Raised" : "Online"} />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
