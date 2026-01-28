import React from 'react';

/**
 * A general pulse-animated skeleton block
 */
export const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-zinc-200 animate-pulse rounded ${className}`} />
);

/**
 * Skeleton for the Video Library card
 */
export const VideoCardSkeleton = () => (
    <div className="bg-white rounded-xl border border-zinc-100 p-4 space-y-4 shadow-sm">
        {/* Aspect ratio box for video thumbnail skeleton */}
        <Skeleton className="w-full aspect-video rounded-lg" />
        <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-5 w-16" />
        </div>
    </div>
);

/**
 * Skeleton for the Session management card
 */
export const SessionCardSkeleton = () => (
    <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-4 shadow-sm">
        <div className="flex justify-between items-start">
            <div className="space-y-2 w-full">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <div className="space-y-3 py-2">
            <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-40" />
            </div>
        </div>

        <div className="pt-2 flex gap-3">
            <Skeleton className="h-10 grow rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
    </div>
);
