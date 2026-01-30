"use client";

import React, { useRef, useState, useEffect, useCallback, useImperativeHandle } from "react";
import { Maximize, Minimize, Volume2, VolumeX, Timer, AlertCircle, CheckCircle2, LayoutDashboard, Play } from "lucide-react";
import Link from 'next/link';
import { extractDriveFileId, generateEmbedLink } from '@/lib/googleDrive';
import { cn } from '@/lib/utils';

import { getPusherClient } from '@/lib/pusher-client';

interface SyncedVideoPlayerProps {
    sessionId: string;
    videoUrl: string;
    videoSource?: 'supabase' | 'google_drive';
    driveFileId?: string;
    thumbnailUrl?: string;
    scheduledStart: string | Date;
    videoDuration?: number;
    onStatusChange?: (status: "countdown" | "playing" | "ended" | "replay") => void;
}

const SyncedVideoPlayer = React.forwardRef<any, SyncedVideoPlayerProps>(
    ({ sessionId, videoUrl, videoSource, driveFileId, thumbnailUrl, scheduledStart, videoDuration = 0, onStatusChange }, ref) => {
        const [status, setStatus] = useState<"countdown" | "playing" | "ended" | "replay">(
            "countdown"
        );

        // Notify parent whenever status changes
        useEffect(() => {
            onStatusChange?.(status);
        }, [status, onStatusChange]);

        const [timeRemaining, setTimeRemaining] = useState<number>(0);
        const [isBuffering, setIsBuffering] = useState(true);
        const [unmuteRequired, setUnmuteRequired] = useState(false);
        const [isLoaded, setIsLoaded] = useState(false);
        const [isPlaying, setIsPlaying] = useState(false);
        const [volume, setVolume] = useState(1);
        const [muted, setMuted] = useState(false);
        const [isFullscreen, setIsFullscreen] = useState(false);
        const [currentTime, setCurrentTime] = useState(0);
        const [duration, setDuration] = useState(0);

        const containerRef = useRef<HTMLDivElement>(null);
        const innerRef = useRef<HTMLVideoElement>(null);
        const playAttemptRef = useRef<number>(0);
        const playingRef = useRef(false);

        // Mobile Controls State
        const [showControls, setShowControls] = useState(false);
        const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

        const handleInteraction = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

            if (status === 'playing' || status === 'replay') {
                controlsTimeoutRef.current = setTimeout(() => {
                    setShowControls(false);
                }, 3000); // Auto-hide after 3 seconds
            }
        };

        const toggleControls = (e: React.MouseEvent) => {
            // Don't toggle if clicking on controls themselves
            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;

            if (showControls) {
                setShowControls(false);
                if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            } else {
                handleInteraction();
            }
        };

        // Determine if we should use iframe (Google Drive) or native video (Supabase)
        const isDrive = videoSource === 'google_drive';

        // Expose a consistent API via ref
        useImperativeHandle(ref, () => ({
            get currentTime() {
                if (isDrive) {
                    const now = Date.now();
                    const start = new Date(scheduledStart).getTime();
                    const elapsed = (now - start) / 1000;
                    return Math.max(0, Math.min(elapsed, videoDuration));
                }
                return innerRef.current?.currentTime || 0;
            },
            set currentTime(val: number) {
                if (!isDrive && innerRef.current) innerRef.current.currentTime = val;
            },
            pause: () => {
                if (!isDrive && innerRef.current) innerRef.current.pause();
            },
            play: () => {
                if (!isDrive && innerRef.current) innerRef.current.play();
            }
        }), [isDrive, scheduledStart, videoDuration]);

        // ---- Pusher Live Sync Logic ----
        useEffect(() => {
            if (!sessionId) return;
            const pusher = getPusherClient();
            const channel = pusher.subscribe(`session-${sessionId}`);

            channel.bind('client-video-sync', (data: { action: 'play' | 'pause' | 'seek', currentTime: number, timestamp: number }) => {
                // console.log('Received Sync Event:', data);
                if (isDrive) return; // Drive sync is harder, for now skip or implement partial

                const video = innerRef.current;
                if (!video) return;

                if (data.action === 'seek') {
                    video.currentTime = data.currentTime;
                } else if (data.action === 'play') {
                    video.currentTime = data.currentTime;
                    safePlay(video);
                    setStatus('playing');
                } else if (data.action === 'pause') {
                    video.pause();
                    playingRef.current = false;
                    setIsPlaying(false);
                }
            });

            return () => {
                channel.unbind('client-video-sync');
                // We typically don't unsubscribe here if other components use the channel, 
                // but if this component is unmounted, we should probably let it be. 
                // However, JoinSessionClient manages the subscription usually.
                // Assuming JoinSessionClient keeps the connection alive.
            };
        }, [sessionId, isDrive]);


        // ---- Time Sync Logic (Fallback / Auto Start) ----
        const updateSyncStatus = useCallback(() => {
            // Note: If admin is controlling, we might want to disable this auto-sync 
            // or make it less aggressive. For now, we keep it for "Countdown" -> "Playing" transition.

            const now = new Date().getTime();
            const start = new Date(scheduledStart).getTime();
            const elapsed = Math.floor((now - start) / 1000);

            // Aggressive Sync Check (Interval based)
            // Only do this if we haven't received a manual event recently (TODO)
            if (status === 'playing' && !isDrive && innerRef.current && !innerRef.current.paused) {
                // ... existing sync logic ...
                // For now, let's relax it or keep it as backup
                // const expectedTime = (now - start) / 1000;
                // if (Math.abs(innerRef.current.currentTime - expectedTime) > 3) {
                //    // console.log("Aggressive Sync (Interval): Drifting detected, seeking to", expectedTime);
                //    // innerRef.current.currentTime = expectedTime;
                // }
            }

            if (elapsed < 0) {
                setStatus("countdown");
                setTimeRemaining(Math.abs(elapsed));
            } else if (videoDuration > 0 && elapsed > videoDuration) {
                if (status !== "replay" && status !== "ended" && status !== 'playing') {
                    // Allow 'playing' to continue if admin extended it/paused
                    // But if it really ended based on schedule? 
                    // Let's rely on admin to END it, or keep schedule.
                    // For now, let's stick to schedule for END state for safety.
                    setStatus("ended");
                }
            } else {
                if (status !== "playing" && status !== 'replay') { // Don't auto-switch if in replay
                    setStatus("playing");
                }
            }
        }, [scheduledStart, videoDuration, status, isDrive]);

        // Native Playback Helpers (Supabase Only)
        const safePlay = useCallback(async (video: HTMLVideoElement) => {
            try {
                const maybePromise = video.play();
                if (maybePromise && typeof (maybePromise as any).then === "function") await maybePromise;
                setIsPlaying(true);
                playingRef.current = true;
            } catch (err: any) {
                playingRef.current = false;
                if (err?.name === "NotAllowedError") {
                    video.muted = true;
                    setMuted(true);
                    setUnmuteRequired(true);
                    try {
                        await video.play();
                        setIsPlaying(true);
                        playingRef.current = true;
                    } catch { }
                }
            }
        }, []);

        useEffect(() => {
            updateSyncStatus();
            const interval = setInterval(updateSyncStatus, 1000);
            return () => clearInterval(interval);
        }, [updateSyncStatus]);

        // Auto-play trigger when status becomes 'playing'
        useEffect(() => {
            if (status === 'playing' && !isDrive && innerRef.current) {
                safePlay(innerRef.current);
            }
        }, [status, isDrive, safePlay]);

        useEffect(() => {
            if (isDrive) {
                // If it's drive, we don't need the native listeners
                setIsLoaded(true);
                setIsBuffering(false);
                return;
            }

            const video = innerRef.current;
            if (!video) return;

            const onCanPlay = () => {
                setIsLoaded(true);
                setIsBuffering(false);
                if (status === "playing" || status === "replay") {
                    // Fix: Do NOT auto-seek to scheduled time. Wait for Admin sync or start at 0.
                    // const elapsed = (Date.now() - new Date(scheduledStart).getTime()) / 1000;
                    // if (status === "playing") video.currentTime = elapsed;

                    // Start at 0 or current pos
                    safePlay(video);
                }
            };
            const onWaiting = () => setIsBuffering(true);
            const onPlaying = () => {
                setIsBuffering(false);
                setIsPlaying(true);
                playingRef.current = true;

                // Removed Aggressive Sync to prevent jumping to "scheduled time"
                // Now relies on Admin broadcast for sync
                /*
                if (status === 'playing') {
                    const expectedTime = (Date.now() - new Date(scheduledStart).getTime()) / 1000;
                    if (Math.abs(video.currentTime - expectedTime) > 3) {
                         console.log("Aggressive Sync: Drifting detected, seeking to", expectedTime);
                         video.currentTime = expectedTime;
                    }
                }
                */
            };
            const onPause = () => { setIsPlaying(false); playingRef.current = false; };
            const onTimeUpdate = () => setCurrentTime(video.currentTime);
            const onDurationChange = () => setDuration(video.duration);

            video.addEventListener("canplay", onCanPlay);
            video.addEventListener("waiting", onWaiting);
            video.addEventListener("playing", onPlaying);
            video.addEventListener("pause", onPause);
            video.addEventListener("timeupdate", onTimeUpdate);
            video.addEventListener("durationchange", onDurationChange);

            return () => {
                video.removeEventListener("canplay", onCanPlay);
                video.removeEventListener("waiting", onWaiting);
                video.removeEventListener("playing", onPlaying);
                video.removeEventListener("pause", onPause);
                video.removeEventListener("timeupdate", onTimeUpdate);
                video.removeEventListener("durationchange", onDurationChange);
            };
        }, [isDrive, status, scheduledStart, safePlay]);

        // Fullscreen Logic with Event Listener
        useEffect(() => {
            const handleFullscreenChange = () => {
                setIsFullscreen(!!document.fullscreenElement);
            };
            document.addEventListener('fullscreenchange', handleFullscreenChange);
            return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
        }, []);

        const toggleFullscreen = async () => {
            if (!containerRef.current) return;
            try {
                if (!document.fullscreenElement) {
                    await containerRef.current.requestFullscreen();
                } else {
                    if (document.exitFullscreen) await document.exitFullscreen();
                }
            } catch (err) {
                console.error("Fullscreen error:", err);
            }
        };

        const formatTime = (totalSeconds: number) => {
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = Math.floor(totalSeconds % 60);
            return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        };

        // If Google Drive, calculate the jump time for "Live" mode
        const driveEmbedUrl = React.useMemo(() => {
            if (!isDrive) return null;
            const fileId = driveFileId || extractDriveFileId(videoUrl);
            if (!fileId) return null;

            let url = `https://drive.google.com/file/d/${fileId}/preview`;
            if (status === 'playing') {
                const elapsed = Math.floor((Date.now() - new Date(scheduledStart).getTime()) / 1000);
                if (elapsed > 0) url += `?t=${elapsed}`;
            }
            return url;
        }, [isDrive, videoUrl, driveFileId, status, scheduledStart]);

        return (
            <div
                ref={containerRef}
                onClick={toggleControls}
                onMouseMove={handleInteraction}
                onMouseLeave={() => setShowControls(false)}
                className={cn(
                    "relative w-full overflow-hidden bg-black shadow-2xl group rounded-2xl border border-white/5",
                    (status === "countdown" || status === "ended") ? "aspect-[9/16] md:aspect-video h-full object-cover" : "aspect-video"
                )}
            >
                {/* BRANCHED RENDERING: Drive (Iframe) vs Supabase (Native) */}
                {isDrive ? (
                    <iframe
                        src={driveEmbedUrl || ""}
                        className="h-full w-full pointer-events-auto"
                        allow="autoplay"
                        onLoad={() => {
                            setIsBuffering(false);
                            setIsLoaded(true);
                        }}
                    />
                ) : (
                    <video
                        ref={innerRef}
                        src={videoUrl}
                        className="h-full w-full object-contain"
                        playsInline
                        muted={muted}
                        preload="auto"
                        poster={thumbnailUrl}
                        crossOrigin="anonymous"
                    />
                )}

                {/* Connection Spinner */}
                {(isBuffering || !isLoaded) && (status === 'playing' || status === 'replay') && !isDrive && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="w-12 h-12 border-4 border-[#2D8CFF] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-white font-bold opacity-0 animate-in fade-in duration-500">Connecting to Stream...</p>
                    </div>
                )}

                {/* Click to Join / Unmute Overlay (For Auto-play policies) */}
                {status === 'playing' && !isDrive && (unmuteRequired || !isPlaying) && isLoaded && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                        <button
                            onClick={() => {
                                if (innerRef.current) {
                                    innerRef.current.muted = false;
                                    setMuted(false);
                                    setUnmuteRequired(false);
                                    safePlay(innerRef.current);
                                }
                            }}
                            className="group relative flex items-center gap-4 rounded-full bg-white/10 px-8 py-4 backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
                        >
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#2D8CFF] shadow-lg shadow-blue-500/30">
                                <Volume2 className="h-8 w-8 text-white animate-pulse" />
                                <div className="absolute -inset-1 rounded-full border-2 border-white/20 animate-ping" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-white">Tap to Join Live Class</p>
                                <p className="text-xs font-medium text-gray-300">Audio Muted by Browser</p>
                            </div>
                        </button>
                    </div>
                )}

                {status === "countdown" && (
                    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-gray-900 text-white">
                        <Timer className="mb-4 h-12 w-12 text-[#2D8CFF] animate-pulse" />
                        <h2 className="text-xl font-bold uppercase tracking-wider mb-2">Class Starts In</h2>
                        <div className="rounded-xl bg-white/10 px-6 py-2 font-mono text-4xl font-bold backdrop-blur-md border border-white/10">
                            {formatTime(timeRemaining)}
                        </div>
                    </div>
                )}

                {status === "ended" && (
                    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-gray-900 text-white">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-black uppercase mb-6">Class Ended</h2>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setStatus("replay")}
                                className="flex items-center gap-2 px-6 py-2 bg-[#2D8CFF] text-white font-bold rounded-lg hover:scale-105 transition-transform"
                            >
                                <Play className="h-4 w-4 fill-current" /> Watch Replay
                            </button>
                            <Link href="/student" className="flex items-center gap-2 px-6 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700">
                                <LayoutDashboard className="h-4 w-4" /> Dashboard
                            </Link>
                        </div>
                    </div>
                )}

                {/* Custom Controls (Only for Native Video - Supabase) */}
                {!isDrive && status !== "countdown" && status !== "ended" && (
                    <div className={cn(
                        "absolute inset-0 z-20 flex flex-col justify-end p-4 transition-opacity duration-300 pointer-events-none",
                        showControls ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                        <div className="w-full flex flex-col gap-2 pointer-events-auto bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10">
                            {status === "replay" && (
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration || videoDuration || 0}
                                        step="0.1"
                                        value={currentTime}
                                        disabled={status !== "replay"}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (innerRef.current) innerRef.current.currentTime = val;
                                            setCurrentTime(val);
                                        }}
                                        className={cn(
                                            "w-full h-1 rounded-full accent-[#2D8CFF] bg-white/20 cursor-pointer appearance-none transition-all",
                                            status === "replay" ? "hover:h-2" : "cursor-not-allowed opacity-50"
                                        )}
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-300 font-mono">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration || videoDuration)}</span>
                                    </div>
                                </div>
                            )}
                            {status === 'playing' && (
                                <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden mb-2">
                                    <div className="h-full bg-red-500 w-full animate-pulse" />
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Play/Pause Button - Only in Replay Mode */}
                                    {status === "replay" && (
                                        <button
                                            onClick={() => {
                                                if (innerRef.current) {
                                                    if (isPlaying) innerRef.current.pause();
                                                    else safePlay(innerRef.current);
                                                }
                                            }}
                                            className="text-white hover:text-[#2D8CFF] transition-colors"
                                        >
                                            {isPlaying ? <div className="flex gap-1"><div className="w-1.5 h-4 bg-current" /><div className="w-1.5 h-4 bg-current" /></div> : <Play className="h-5 w-5 fill-current" />}
                                        </button>
                                    )}
                                    <div className="flex items-center gap-2 group/vol">
                                        <button onClick={() => setMuted(!muted)} className="text-white">
                                            {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                        </button>
                                        <input
                                            type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                                            onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                                            className="w-16 h-1 accent-[#2D8CFF] bg-white/20 rounded-full"
                                        />
                                    </div>
                                </div>
                                <button onClick={toggleFullscreen} className="text-white hover:text-[#2D8CFF]">
                                    {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Drive Info Badge (Since we can't show custom controls on iframe) */}
                {isDrive && status !== "countdown" && status !== "ended" && (
                    <>
                        {/* Status Badge */}
                        <div className={cn(
                            "absolute top-4 right-4 z-30 transition-opacity duration-300",
                            showControls ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}>
                            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                                <div className={`w-2 h-2 rounded-full ${status === 'playing' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                                <span className="text-[10px] text-white font-bold uppercase tracking-wider">
                                    {status === 'playing' ? 'Live Stream' : 'Recorded Replay'}
                                </span>
                            </div>
                        </div>

                        {/* LIVE MODE: Interaction Shield for Bottom Controls */}
                        {status === 'playing' && (
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-transparent z-50 cursor-not-allowed" title="Seeking disabled during Live Stream" />
                        )}
                    </>
                )}
            </div>
        );
    }
);

SyncedVideoPlayer.displayName = "SyncedVideoPlayer";

export default SyncedVideoPlayer;