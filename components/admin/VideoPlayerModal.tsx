'use client';

import React, { useState, useRef, useEffect } from 'react';

import { X, Maximize, Minimize, Volume2, VolumeX, Play, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';



import { extractDriveFileId, generateEmbedLink } from '@/lib/googleDrive';

interface VideoPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    video: {
        id: string;
        title: string;
        video_url: string;
        source: 'supabase' | 'google_drive';
        drive_file_id?: string;
        duration?: number;
    } | null;
    sessionId?: string; // Add sessionId for sync
}

export default function VideoPlayerModal({ isOpen, onClose, video, sessionId }: VideoPlayerModalProps) {
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSeizing, setIsSeaking] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
    const playingRef = useRef(false); // Guard for race conditions

    // Auto-hide controls
    const resetControlsTimer = () => {
        setShowControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => {
            if (playingRef.current) setShowControls(false);
        }, 3000);
    };

    const [isMounted, setIsMounted] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    // Opening Animation & AutoPlay
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsBuffering(true);
            const mountTimer = setTimeout(() => setIsMounted(true), 50);

            // Google Drive loading fallback: if onLoad doesn't fire in 5 seconds, hide spinner anyway
            const bufferingFallback = setTimeout(() => {
                setIsBuffering(false);
            }, 5000);

            return () => {
                clearTimeout(mountTimer);
                clearTimeout(bufferingFallback);
            };
        } else {
            // Close cleanup
            setPlaying(false);
            playingRef.current = false;
            if (videoRef.current) {
                try {
                    videoRef.current.pause();
                } catch { } // Ignore cleanup errors
            }
            setIsMounted(false);
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Safe Play Helper
    const safePlay = async () => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        try {
            const promise = videoEl.play();
            if (promise !== undefined) {
                playingRef.current = true;
                await promise;
                setPlaying(true);
            }
        } catch (error: any) {
            playingRef.current = false;
            setPlaying(false);
            if (error.name === 'AbortError') {
                // Benign error: play was interrupted (e.g. by pause or close)
                // console.log("Play interrupted (AbortError)");
            } else if (error.name === 'NotAllowedError') {
                // Autoplay blocked - fallback to muted
                setMuted(true);
                videoEl.muted = true;
                try {
                    await videoEl.play();
                    playingRef.current = true;
                    setPlaying(true);
                } catch (e) {
                    console.error("Autoplay failed:", e);
                }
            } else {
                console.error("Playback error:", error);
            }
        }
    };

    const safePause = () => {
        const videoEl = videoRef.current;
        if (!videoEl) return;
        videoEl.pause();
        playingRef.current = false;
        setPlaying(false);
    };

    const broadcastSync = async (action: 'play' | 'pause' | 'seek', time: number) => {
        if (!sessionId || !video) return;
        try {
            await fetch('/api/pusher/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel: `session-${sessionId}`,
                    event: 'client-video-sync',
                    data: {
                        action,
                        currentTime: time,
                        timestamp: Date.now()
                    }
                })
            });
        } catch (err) {
            console.error('Failed to broadcast sync:', err);
        }
    };

    const togglePlay = () => {
        if (playingRef.current) {
            safePause();
            broadcastSync('pause', currentTime);
        } else {
            safePlay();
            broadcastSync('play', currentTime);
        }
    };

    // AutoPlay when ready
    useEffect(() => {
        if (isMounted && isOpen && videoRef.current) {
            // Small delay to ensure render
            setTimeout(() => {
                safePlay();
            }, 300);
        }
    }, [isMounted, isOpen]);

    const handleClose = () => {
        safePause();
        onClose();
    };

    // Fullscreen
    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const formatTime = (time: number) => {
        if (isNaN(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    };

    const handleSeekEnd = () => {
        setIsSeaking(false);
        broadcastSync('seek', currentTime);
        // If we were playing, ensure we resume and sync play state
        if (playingRef.current) {
            broadcastSync('play', currentTime);
        }
    };

    // Sync Volume
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = muted;
        }
    }, [volume, muted]);

    if (!shouldRender || !video) return null;

    const isDriveLink = video.source === 'google_drive' || (video.video_url && video.video_url.includes('drive.google.com'));

    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 transition-all duration-300",
            isMounted ? "opacity-100 visible" : "opacity-0 invisible"
        )}>
            <div
                ref={containerRef}
                className={cn(
                    "relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group transition-all duration-300 transform",
                    isMounted ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
                )}
                onMouseMove={resetControlsTimer}
                onClick={() => {
                    // Click on video toggles play, but ignore if clicking controls
                    if (showControls) return;
                    togglePlay();
                }}
            >
                {/* Video Content */}
                {isDriveLink ? (
                    <div className="absolute inset-0 w-full h-full bg-black">
                        <iframe
                            src={`${generateEmbedLink(video.drive_file_id || extractDriveFileId(video.video_url) || '')}`}
                            className={cn(
                                "w-full h-full border-0 transition-opacity duration-500",
                                isBuffering ? "opacity-0" : "opacity-100"
                            )}
                            allow="autoplay; fullscreen; picture-in-picture"
                            onLoad={() => setIsBuffering(false)}
                        />
                        {isBuffering && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-6 text-center">
                                <div className="w-12 h-12 border-4 border-[#2D8CFF] border-t-transparent rounded-full animate-spin mb-4"></div>
                                <div className="space-y-2 max-w-xs transition-all animate-in fade-in slide-in-from-bottom-2 duration-700">
                                    <h3 className="text-white font-semibold">Connecting to Google Drive...</h3>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        Google is preparing your stream. If this takes too long, verify your link permissions or try the button below.
                                    </p>
                                    <a
                                        href={video.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all border border-white/20"
                                    >
                                        <Play className="h-3 w-3 fill-current" />
                                        Open Directly in Google Drive
                                    </a>
                                </div>
                            </div>
                        )}
                        {!isBuffering && (
                            <a
                                href={video.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-4 right-4 z-40 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md hover:bg-black/80 transition-all border border-white/10"
                            >
                                <Play className="h-2 w-2 fill-current" />
                                Open in Drive
                            </a>
                        )}
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            src={video.video_url}
                            className="w-full h-full object-contain"
                            playsInline
                            onWaiting={() => setIsBuffering(true)}
                            onPlaying={() => {
                                setIsBuffering(false);
                                playingRef.current = true;
                                setPlaying(true);
                            }}
                            onTimeUpdate={() => {
                                if (videoRef.current && !isSeizing) {
                                    setCurrentTime(videoRef.current.currentTime);
                                }
                            }}
                            onLoadedMetadata={() => {
                                if (videoRef.current) {
                                    setDuration(videoRef.current.duration);
                                }
                            }}
                            onPause={() => {
                                playingRef.current = false;
                                setPlaying(false);
                            }}
                            onEnded={() => {
                                playingRef.current = false;
                                setPlaying(false);
                            }}
                        />

                        {/* Buffering Indicator */}
                        {isBuffering && playing && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                <div className="w-12 h-12 border-4 border-[#2D8CFF] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </>
                )}

                {/* Close Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                    className={cn(
                        "absolute top-4 right-4 z-30 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-opacity duration-300",
                        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                >
                    <X className="h-6 w-6" />
                </button>

                {/* Header Overlay */}
                <div className={cn(
                    "absolute top-0 inset-x-0 p-6 bg-gradient-to-b from-black/80 to-transparent z-20 transition-opacity duration-300 text-white flex items-center justify-between",
                    showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                    <h2 className="text-xl font-bold line-clamp-1">{video.title}</h2>
                    {isDriveLink && video.duration && (
                        <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-sm font-medium backdrop-blur-md border border-white/10">
                            <span className="text-white/60">Duration:</span>
                            <span>{formatTime(video.duration)}</span>
                        </div>
                    )}
                </div>

                {/* Custom Controls - Only for Supabase Videos */}
                {!isDriveLink && (
                    <div
                        className={cn(
                            "absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-20 transition-opacity duration-300",
                            showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                        onClick={(e) => e.stopPropagation()} // Prevent click-through to video toggle
                    >
                        {/* Progress Bar */}
                        <div className="mb-4 flex items-center gap-4 group/progress">
                            <span className="text-xs font-medium text-white/80 w-12 text-right font-mono">
                                {formatTime(currentTime)}
                            </span>
                            <div className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden group-hover/progress:h-2 transition-all">
                                {/* Background Track */}
                                <div className="absolute inset-0 w-full h-full" />

                                {/* Fill Track */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-[#2D8CFF] rounded-full transition-all"
                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                />

                                {/* Input Range (Invisible but interactive) */}
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 0}
                                    step="any"
                                    value={currentTime}
                                    onChange={handleSeek}
                                    onMouseDown={() => {
                                        setIsSeaking(true);
                                        // Optional: pause while seeking?
                                    }}
                                    onMouseUp={handleSeekEnd}
                                    onTouchEnd={handleSeekEnd} // Mobile support
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                            </div>
                            <span className="text-xs font-medium text-white/50 w-12 font-mono">
                                {formatTime(duration)}
                            </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={togglePlay}
                                    className="text-white hover:text-[#2D8CFF] transition-colors p-2"
                                >
                                    {playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
                                </button>

                                <div className="flex items-center gap-2 group/volume">
                                    <button
                                        onClick={() => setMuted(!muted)}
                                        className="text-white p-2"
                                    >
                                        {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={muted ? 0 : volume}
                                        onChange={(e) => {
                                            setVolume(parseFloat(e.target.value));
                                            setMuted(false);
                                        }}
                                        className="w-24 accent-[#2D8CFF] h-1.5 rounded-full cursor-pointer hidden sm:block"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleFullscreen}
                                    className="text-white hover:text-[#2D8CFF] transition-colors p-2"
                                >
                                    {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
