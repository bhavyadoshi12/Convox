"use client";

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { generateEmbedLink } from '@/lib/googleDrive';
import { cn } from '@/lib/utils';

// Dynamic import for ReactPlayer to prevent SSR issues and resolve type confusion
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

interface UniversalVideoPlayerProps {
    video: {
        video_url: string;
        source?: 'supabase' | 'google_drive';
        drive_file_id?: string;
    };
    scheduledStartTime: string;
    isMuted?: boolean;
    onReady?: () => void;
}

export default function UniversalVideoPlayer({
    video,
    scheduledStartTime,
    isMuted = false,
    onReady
}: UniversalVideoPlayerProps) {
    const playerRef = useRef<any>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    // Calculate sync position
    useEffect(() => {
        const updateSync = () => {
            const start = new Date(scheduledStartTime).getTime();
            const now = Date.now();
            const elapsed = Math.max(0, (now - start) / 1000);
            setElapsedSeconds(elapsed);

            // For ReactPlayer (Supabase)
            if (video.source !== 'google_drive' && playerRef.current && isPlayerReady) {
                try {
                    const currentPlayerTime = playerRef.current.getCurrentTime();
                    // Seek if desync is more than 2 seconds
                    if (Math.abs(currentPlayerTime - elapsed) > 2) {
                        playerRef.current.seekTo(elapsed, 'seconds');
                    }
                } catch (e) {
                    console.warn("ReactPlayer seek failed:", e);
                }
            }
        };

        updateSync();
        const interval = setInterval(updateSync, 5000); // Check sync every 5s
        return () => clearInterval(interval);
    }, [scheduledStartTime, video.source, isPlayerReady]);

    if (video.source === 'google_drive' && video.drive_file_id) {
        const embedUrl = generateEmbedLink(video.drive_file_id);
        // Add autoplay and start parameters
        // Note: Google Drive iframe start parameter is 'start' (seconds)
        const syncUrl = `${embedUrl}?autoplay=1&start=${Math.floor(elapsedSeconds)}`;

        return (
            <div className="relative w-full aspect-video bg-black overflow-hidden rounded-xl shadow-lg">
                <iframe
                    src={syncUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="autoplay; fullscreen"
                    onLoad={() => {
                        setIsPlayerReady(true);
                        onReady?.();
                    }}
                />
                {/* Overlay to block controls/interaction if needed, though Drive iframe manages itself */}
                <div className="absolute inset-0 pointer-events-none" />
            </div>
        );
    }

    // Default to Supabase (ReactPlayer)
    const Player = ReactPlayer as any;

    return (
        <div className="relative w-full aspect-video bg-black overflow-hidden rounded-xl shadow-lg">
            <Player
                ref={playerRef}
                url={video.video_url}
                width="100%"
                height="100%"
                playing={true}
                muted={isMuted}
                controls={false}
                onReady={() => {
                    setIsPlayerReady(true);
                    onReady?.();
                }}
                config={{
                    file: {
                        attributes: {
                            style: { width: '100%', height: '100%', objectFit: 'contain' }
                        }
                    }
                } as any}
            />
        </div>
    );
}
