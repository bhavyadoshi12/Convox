"use client";

import React, { useRef, useState, useEffect, useCallback, useImperativeHandle } from "react";
import { Maximize, Minimize, Volume2, VolumeX, Timer, AlertCircle, CheckCircle2, LayoutDashboard, Play } from "lucide-react";
import Link from 'next/link';
import { extractDriveFileId, generateEmbedLink } from '@/lib/googleDrive';
import { cn } from '@/lib/utils';

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

        // ---- Time Sync Logic ----
        const updateSyncStatus = useCallback(() => {
            const now = new Date().getTime();
            const start = new Date(scheduledStart).getTime();
            const elapsed = Math.floor((now - start) / 1000);

            if (elapsed < 0) {
                setStatus("countdown");
                setTimeRemaining(Math.abs(elapsed));
            } else if (videoDuration > 0 && elapsed > videoDuration) {
                if (status !== "replay" && status !== "ended") {
                    setStatus("ended");
                }
            } else {
                if (status !== "playing") {
                    setStatus("playing");
                }
            }
        }, [scheduledStart, videoDuration, status]);

        useEffect(() => {
            updateSyncStatus();
            const interval = setInterval(updateSyncStatus, 1000);
            return () => clearInterval(interval);
        }, [updateSyncStatus]);

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
                    const elapsed = (Date.now() - new Date(scheduledStart).getTime()) / 1000;
                    if (status === "playing") video.currentTime = elapsed;
                    safePlay(video);
                }
            };
            const onWaiting = () => setIsBuffering(true);
            const onPlaying = () => { setIsBuffering(false); setIsPlaying(true); playingRef.current = true; };
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

        const toggleFullscreen = () => {
            if (!containerRef.current) return;
            if (!document.fullscreenElement) {
                containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                document.exitFullscreen();
                setIsFullscreen(false);
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
                className="relative aspect-video w-full overflow-hidden bg-black shadow-2xl group rounded-2xl border border-white/5"
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

                {/* Overlays (Only for Countdown and Buffer) */}
                {isBuffering && (status === 'playing' || status === 'replay') && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="w-12 h-12 border-4 border-[#2D8CFF] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-white font-bold opacity-0 animate-in fade-in duration-500">Connecting to Stream...</p>
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
                    <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="w-full flex flex-col gap-2 pointer-events-auto bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10">
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
                                    {status === 'playing' && <span className="text-red-500 font-black animate-pulse">● LIVE</span>}
                                    <span>{formatTime(duration || videoDuration)}</span>
                                </div>
                            </div>
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
                        <div className="absolute top-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
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