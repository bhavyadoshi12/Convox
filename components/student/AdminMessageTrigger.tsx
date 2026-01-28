"use client";

import { useEffect, useRef } from 'react';

interface ScheduledMessage {
    timestamp: number;
    message: string;
}

interface AdminMessageTriggerProps {
    sessionId: string;
    adminMessages: ScheduledMessage[];
    playerRef: React.RefObject<any>;
}

export default function AdminMessageTrigger({
    sessionId,
    adminMessages,
    playerRef
}: AdminMessageTriggerProps) {
    const triggeredMessages = useRef<Set<number>>(new Set());

    useEffect(() => {
        const interval = setInterval(() => {
            if (!playerRef.current) return;

            try {
                // Native video element uses .currentTime property
                const currentTime = Math.floor(playerRef.current.currentTime);

                // Find messages that match the current time (or are just before it) 
                // and haven't been triggered in this local instance yet
                adminMessages.forEach(msg => {
                    if (msg.timestamp === currentTime && !triggeredMessages.current.has(msg.timestamp)) {
                        // Mark as triggered locally first to avoid duplicate calls during the same second
                        triggeredMessages.current.add(msg.timestamp);

                        triggerAdminMessage(sessionId, currentTime);
                    }
                });
            } catch (err) {
                // Silently fail if playerRef is being initialized
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [sessionId, adminMessages, playerRef]);

    const triggerAdminMessage = async (sid: string, ts: number) => {
        try {
            await fetch('/api/chat/trigger-admin-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sessionId: sid,
                    timestamp: ts
                })
            });
        } catch (err) {
            console.error('Failed to trigger admin message:', err);
            // If it fails, we keep it in the set so we don't spam, 
            // but in a production app we might want a retry logic.
        }
    };

    // This is a headless component
    return null;
}
