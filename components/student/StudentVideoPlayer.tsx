"use client";

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;
import { Maximize, Minimize, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentVideoPlayerProps {
    url: string;
    thumbnail?: string;
    onProgress?: (state: any) => void;
    isLive: boolean;
}

export default function StudentVideoPlayer({ url, thumbnail, onProgress, isLive }: StudentVideoPlayerProps) {
    const [playing, setPlaying] = useState(true);
    const [volume, setVolume] = useState(0.8);
    const [muted, setMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(false);

    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative aspect-video w-full overflow-hidden bg-black shadow-2xl group"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <ReactPlayer
                ref={playerRef}
                url={url}
                width="100%"
                height="100%"
                playing={playing}
                volume={volume}
                muted={muted}
                onProgress={onProgress}
                config={{
                    file: {
                        attributes: {
                            controlsList: 'nodownload',
                            disablePictureInPicture: 'true'
                        }
                    }
                } as any}
            />

            {/* Custom Overlays (Since we disabled native controls) */}
            <div className={cn(
                "absolute inset-0 z-10 flex flex-col justify-between bg-gradient-to-t from-black/60 via-transparent to-black/30 transition-opacity duration-300",
                showControls || !playing ? "opacity-100" : "opacity-0"
            )}>
                {/* Top: Status */}
                <div className="p-4">
                    {isLive && (
                        <div className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white animate-pulse">
                            <span className="h-2 w-2 rounded-full bg-white"></span>
                            Live
                        </div>
                    )}
                </div>

                {/* Center: Play/Pause Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {!playing && (
                        <button
                            onClick={() => setPlaying(true)}
                            className="rounded-full bg-white/20 p-6 backdrop-blur-sm transition-transform hover:scale-110"
                        >
                            <Play className="h-12 w-12 text-white fill-current" />
                        </button>
                    )}
                </div>

                {/* Bottom: Custom Controls */}
                <div className="flex items-center justify-between p-4 px-6 scale-95 origin-bottom">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setPlaying(!playing)}
                            className="text-white hover:text-[#2D8CFF] transition-colors"
                        >
                            {playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
                        </button>

                        <div className="flex items-center gap-2 group/volume">
                            <button
                                onClick={() => setMuted(!muted)}
                                className="text-white"
                            >
                                {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={muted ? 0 : volume}
                                onChange={(e) => {
                                    setVolume(parseFloat(e.target.value));
                                    setMuted(false);
                                }}
                                className="w-0 scale-x-0 origin-left transition-all group-hover/volume:w-20 group-hover/volume:scale-x-100 accent-[#2D8CFF] h-1.5 rounded-full cursor-pointer"
                            />
                        </div>
                    </div>

                    <button
                        onClick={toggleFullscreen}
                        className="text-white hover:text-[#2D8CFF] transition-colors"
                    >
                        {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
