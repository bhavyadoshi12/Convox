"use client";

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import React, { memo } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

const Button = memo(React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
        const variants = {
            primary: 'bg-[#2D8CFF] text-white hover:bg-blue-600 focus:ring-blue-200 shadow-lg shadow-blue-100',
            secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-100',
            danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-100 shadow-lg shadow-red-100',
            ghost: 'bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-5 py-2.5 text-sm font-bold',
            lg: 'px-6 py-3 text-base font-black uppercase tracking-wider',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={cn(
                    'inline-flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:grayscale disabled:opacity-50 focus:outline-none focus:ring-4 select-none',
                    variants[variant],
                    sizes[size],
                    className
                )}
                suppressHydrationWarning
                {...props}
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="opacity-80">Please wait</span>
                    </div>
                ) : (
                    children
                )}
            </button>
        );
    }
));

Button.displayName = 'Button';

export { Button };
