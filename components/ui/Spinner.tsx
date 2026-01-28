"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
    variant?: 'default' | 'dots' | 'pulse';
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    className?: string;
}

export const Spinner = ({
    variant = 'default',
    size = 'md',
    color = 'text-[#2D8CFF]',
    className
}: SpinnerProps) => {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    const dotSizes = {
        sm: 'h-1 w-1',
        md: 'h-2 w-2',
        lg: 'h-3 w-3',
    };

    if (variant === 'dots') {
        return (
            <div className={cn("flex items-center gap-1", className)}>
                <div className={cn("rounded-full animate-bounce [animation-delay:-0.3s]", dotSizes[size], color.replace('text-', 'bg-'))} />
                <div className={cn("rounded-full animate-bounce [animation-delay:-0.15s]", dotSizes[size], color.replace('text-', 'bg-'))} />
                <div className={cn("rounded-full animate-bounce", dotSizes[size], color.replace('text-', 'bg-'))} />
            </div>
        );
    }

    if (variant === 'pulse') {
        return (
            <div className={cn("relative flex items-center justify-center", sizes[size], className)}>
                <div className={cn("absolute h-full w-full rounded-full opacity-75 animate-ping", color.replace('text-', 'bg-'))} />
                <div className={cn("relative h-2/3 w-2/3 rounded-full", color.replace('text-', 'bg-'))} />
            </div>
        );
    }

    return (
        <div className={cn("relative", sizes[size], className)}>
            <div
                className={cn(
                    "h-full w-full rounded-full border-2 border-current border-t-transparent animate-spin opacity-20",
                    color
                )}
            />
            <div
                className={cn(
                    "absolute inset-0 h-full w-full rounded-full border-2 border-transparent border-t-current animate-spin",
                    color
                )}
            />
        </div>
    );
};
