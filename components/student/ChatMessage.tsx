import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
    msg: {
        sender: string;
        message: string;
        type: 'user' | 'admin';
        timestamp: string | Date;
    };
    isMe: boolean;
}

const ChatMessage = ({ msg, isMe }: ChatMessageProps) => {
    const isAdmin = msg.type === 'admin';

    return (
        <div
            className={cn(
                "flex flex-col max-w-[85%]",
                isMe ? "ml-auto items-end" : "items-start",
                isAdmin && !isMe && "items-start"
            )}
        >
            {!isAdmin && (
                <span className="mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    {msg.sender}
                </span>
            )}

            <div className={cn(
                "rounded-2xl px-4 py-2 text-sm shadow-sm transition-all",
                isMe ? "bg-[#2D8CFF] text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none",
                isAdmin && "bg-amber-50 border border-amber-100 text-amber-900 rounded-lg flex items-center gap-2"
            )}>
                {isAdmin && <span className="rounded bg-amber-200 px-1 py-0.5 text-[8px] font-black uppercase text-amber-700 not-italic">Instructor</span>}
                {msg.message}
            </div>

            <span className="mt-1 text-[8px] text-gray-300">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    );
};

export default memo(ChatMessage);
