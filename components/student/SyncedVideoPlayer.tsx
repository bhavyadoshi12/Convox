"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Maximize, Minimize, Volume2, VolumeX, Timer, AlertCircle, CheckCircle2, LayoutDashboard, Play } from "lucide-react";
import Link from 'next/link';

interface SyncedVideoPlayerProps {
    sessionId: string;
    videoUrl: string;
    thumbnailUrl?: string;
    scheduledStart: string | Date;
    videoDuration?: number;
    onStatusChange?: (status: "countdown" | "playing" | "ended" | "replay") => void;
}

const SyncedVideoPlayer = React.forwardRef<HTMLVideoElement, SyncedVideoPlayerProps>(
    ({ sessionId, videoUrl, thumbnailUrl, scheduledStart, videoDuration = 0, onStatusChange }, ref) => {
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

        const finalVideoUrl = React.useMemo(() => {
            if (!videoUrl) return null;
            const result = videoUrl.includes("cloudinary.com")
                ? videoUrl.replace(/\.(jpg|jpeg|png|webp)$/i, ".mp4")
                : videoUrl;
            // console.log("Playing normalized video URL:", result);
            return result;
        }, [videoUrl]);

        const containerRef = useRef<HTMLDivElement>(null);
        const innerRef = useRef<HTMLVideoElement>(null);
        const playAttemptRef = useRef<number>(0);
        const playingRef = useRef(false); // guard for play/pause race

        // Helper to force stop video
        const stopVideo = useCallback(() => {
            if (innerRef.current) {
                innerRef.current.pause();
                playingRef.current = false;
                setIsPlaying(false);
            }
        }, []);

        // Merge forwarded ref
        useEffect(() => {
            if (!ref) return;
            if (typeof ref === "function") {
                ref(innerRef.current);
            } else {
                (ref as any).current = innerRef.current;
            }
        }, [ref]);

        // Cleanup on unmount
        useEffect(() => {
            return () => {
                const video = innerRef.current;
                if (video) {
                    try {
                        video.pause();
                    } catch { }
                }
                playingRef.current = false;
                if (playAttemptRef.current) window.clearTimeout(playAttemptRef.current);
            };
        }, []);

        // ---- Time Sync Logic ----
        const updateSyncStatus = useCallback(() => {
            const now = new Date().getTime();
            const start = new Date(scheduledStart).getTime();
            const elapsed = Math.floor((now - start) / 1000);

            if (elapsed < 0) {
                setStatus("countdown");
                setTimeRemaining(Math.abs(elapsed));
            } else if (videoDuration > 0 && elapsed > videoDuration) {
                // Determine if we should move to ended or stay in replay
                if (status !== "replay" && status !== "ended") {
                    setStatus("ended");
                    stopVideo(); // Ensure audio stops
                }
            } else {
                if (status !== "playing") {
                    setStatus("playing");
                }
            }
        }, [scheduledStart, videoDuration, status, stopVideo]);

        useEffect(() => {
            updateSyncStatus();
            const interval = setInterval(updateSyncStatus, 1000);
            return () => clearInterval(interval);
        }, [updateSyncStatus]);

        const seekToCurrentTime = useCallback(() => {
            const video = innerRef.current;
            if (video && status === "playing") {
                const now = new Date().getTime();
                const start = new Date(scheduledStart).getTime();
                const elapsed = (now - start) / 1000;
                if (Math.abs(video.currentTime - elapsed) > 2) {
                    video.currentTime = elapsed;
                }
            }
        }, [scheduledStart, status]);

        // Centralized, safe play helper: handles NotAllowed/Abort & flags correctly
        const safePlay = useCallback(async (video: HTMLVideoElement) => {
            try {
                const maybePromise = video.play();
                if (maybePromise && typeof (maybePromise as any).then === "function") {
                    await maybePromise;
                }
                setIsPlaying(true);
                setUnmuteRequired(false);
                playingRef.current = true;
            } catch (err: any) {
                // Don't mark as playing if it failed
                playingRef.current = false;

                if (err?.name === "NotAllowedError") {
                    // Autoplay blocked — mute & retry
                    video.muted = true;
                    setMuted(true);
                    setUnmuteRequired(true);
                    try {
                        const p2 = video.play();
                        if (p2 && typeof (p2 as any).then === "function") await p2;
                        setIsPlaying(true);
                        playingRef.current = true;
                    } catch {
                        // Still blocked: keep the unmute overlay for user gesture
                    }
                } else if (err?.name === "AbortError") {
                    // Benign: means pending play got interrupted by pause/load/src change
                    // Swallow; outer logic can retry if needed
                } else {
                    console.warn("Video play failed:", err);
                }
            }
        }, []);

        // Attempt play with sync and guards
        const attemptPlay = useCallback(async () => {
            const video = innerRef.current;
            if (!video || !isLoaded) return;

            try {
                // Sync currentTime for "playing" (live-like) mode
                if (status === "playing") {
                    seekToCurrentTime();
                }

                if (playAttemptRef.current) window.clearTimeout(playAttemptRef.current);

                // If already truly playing, don’t spam play
                if (!video.paused && playingRef.current) return;

                await safePlay(video);
            } catch {
                // no-op (safePlay handles)
            }
        }, [isLoaded, status, seekToCurrentTime, safePlay]);

        // Native listeners (use a single readiness event + defer play to next tick)
        useEffect(() => {
            const video = innerRef.current;
            if (!video) return;

            const onCanPlay = () => {
                setIsLoaded(true);
                setIsBuffering(false);
                // Defer to next tick to avoid same-tick load/pause/play races
                setTimeout(() => {
                    if (status === "playing" || status === "replay") {
                        attemptPlay();
                    }
                }, 0);
            };

            const onWaiting = () => setIsBuffering(true);
            const onPlaying = () => {
                setIsBuffering(false);
                setIsPlaying(true);
                playingRef.current = true;
            };
            const onPause = () => {
                setIsPlaying(false);
                playingRef.current = false;
            };

            video.addEventListener("canplay", onCanPlay);
            video.addEventListener("waiting", onWaiting);
            video.addEventListener("playing", onPlaying);
            video.addEventListener("pause", onPause);

            // If already ready (cache), trigger once
            if (video.readyState >= 3) {
                onCanPlay();
            }

            return () => {
                video.removeEventListener("canplay", onCanPlay);
                video.removeEventListener("waiting", onWaiting);
                video.removeEventListener("playing", onPlaying);
                video.removeEventListener("pause", onPause);
            };
        }, [status, attemptPlay]);

        // Trigger attempt after ready (extra safety)
        useEffect(() => {
            if (isLoaded && (status === "playing" || status === "replay") && !isPlaying && !unmuteRequired) {
                attemptPlay();
            }
        }, [isLoaded, status, isPlaying, unmuteRequired, attemptPlay]);

        // Volume & mute sync
        useEffect(() => {
            if (innerRef.current) {
                innerRef.current.volume = volume;
                innerRef.current.muted = muted;
            }
        }, [volume, muted]);

        // Force load safely when URL changes
        useEffect(() => {
            const v = innerRef.current;
            if (v && finalVideoUrl) {
                if (playAttemptRef.current) window.clearTimeout(playAttemptRef.current);
                try {
                    v.pause();
                } catch { }
                playingRef.current = false;

                v.load();
                setIsLoaded(false);
                setIsBuffering(true);
            }
        }, [finalVideoUrl]);

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

        const formatCountdown = (totalSeconds: number) => {
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
                .toString()
                .padStart(2, "0")}`;
        };

        // Force pause when status becomes 'ended'
        useEffect(() => {
            if (status === "ended") {
                if (innerRef.current) {
                    innerRef.current.pause();
                }
                setIsPlaying(false);
                playingRef.current = false;
            }
        }, [status]);

        return (
            <div
                ref={containerRef}
                className="relative aspect-video w-full overflow-hidden bg-black shadow-2xl group rounded-2xl"
            >
                <video
                    ref={innerRef}
                    src={finalVideoUrl || undefined}
                    className="h-full w-full object-contain"
                    playsInline
                    muted={muted}           // keep attribute for autoplay policy
                    preload="metadata"      // light preload to reduce races
                    controls={status === "replay"}
                    poster={thumbnailUrl}
                    onEnded={() => {
                        setStatus("ended");
                        if (innerRef.current) innerRef.current.pause();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                />

                {/* Countdown Overlay */}
                {status === "countdown" && (
                    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-gray-900 text-white shadow-2xl">
                        <Timer className="mb-4 h-16 w-16 text-[#2D8CFF] animate-pulse" />
                        <h2 className="mb-2 text-2xl font-bold tracking-tight uppercase">Class starting soon</h2>
                        <div className="rounded-xl bg-white/10 px-6 py-3 font-mono text-4xl font-black tracking-widest backdrop-blur-md border border-white/10">
                            {formatCountdown(timeRemaining)}
                        </div>
                        <p className="mt-6 text-sm text-gray-400 font-medium">
                            Please stay on this page. The stream will start automatically.
                        </p>
                    </div>
                )}

                {/* Ended Overlay */}
                {status === "ended" && (
                    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-gray-900 text-white shadow-2xl">
                        <div className="rounded-full bg-gray-800 p-6 mb-4">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Stream Ended</h2>
                        <p className="text-gray-400 mb-8 font-medium">The live session has concluded.</p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={async () => {
                                    setStatus("replay");
                                    setIsBuffering(false);
                                    if (innerRef.current) {
                                        innerRef.current.currentTime = 0;
                                        await safePlay(innerRef.current);
                                    }
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform"
                            >
                                <Play className="h-4 w-4" /> Watch Replay
                            </button>
                            <Link
                                href="/student"
                                className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                <LayoutDashboard className="h-4 w-4" /> Dashboard
                            </Link>
                        </div>
                    </div>
                )}

                {/* Tap to Unmute Overlay */}
                {unmuteRequired && status === "playing" && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                        <button
                            onClick={async () => {
                                setMuted(false);
                                setUnmuteRequired(false);
                                if (innerRef.current) {
                                    innerRef.current.muted = false;
                                    await safePlay(innerRef.current);
                                }
                            }}
                            className="flex items-center gap-3 rounded-full bg-[#2D8CFF] px-8 py-4 text-white font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all animate-bounce"
                        >
                            <Volume2 className="h-6 w-6" />
                            CLICK TO JOIN WITH AUDIO
                        </button>
                    </div>
                )}

                {/* Connecting Overlay - Only show if truly stuck and not just starting */}
                {isBuffering && status === "playing" && !unmuteRequired && isPlaying && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 pointer-events-none">
                        <div className="flex gap-1.5 mb-4">
                            <div className="w-3 h-3 bg-[#2D8CFF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-3 h-3 bg-[#2D8CFF] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-3 h-3 bg-[#2D8CFF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <p className="text-white font-bold tracking-widest uppercase text-xs animate-pulse">
                            Connecting to live stream...
                        </p>
                    </div>
                )}

                {/* Persistent Controls Overlay (Hide in Replay Mode as we use native controls) */}
                {status !== "replay" && status !== "countdown" && status !== "ended" && (
                    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div className="flex justify-start">
                            {/* Badge removed as per user request */}
                        </div>

                        <div className="flex items-center justify-between pointer-events-auto">
                            <div className="flex items-center gap-6 rounded-2xl bg-black/40 backdrop-blur-xl px-6 py-3 border border-white/10 shadow-2xl">
                                <div className="flex items-center gap-4 group/volume">
                                    <button
                                        onClick={() => setMuted(!muted)}
                                        className="text-white hover:text-[#2D8CFF] transition-colors"
                                    >
                                        {muted || volume === 0 ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
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
                                        className="w-24 accent-[#2D8CFF] h-1.5 rounded-full cursor-pointer bg-white/20"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={toggleFullscreen}
                                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-[#2D8CFF] transition-all hover:scale-110 active:scale-95 shadow-2xl"
                            >
                                {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

SyncedVideoPlayer.displayName = "SyncedVideoPlayer";

export default SyncedVideoPlayer;