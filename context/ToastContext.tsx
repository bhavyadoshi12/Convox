"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { X, CheckCircle, AlertCircle, Info, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextType {
    addToast: (type: ToastType, message: string) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, message }]);

        setTimeout(() => {
            removeToast(id);
        }, 3000);
    }, [removeToast]);

    // Subscribe to external toast calls
    useEffect(() => {
        return toast.subscribe(({ type, message }) => {
            addToast(type, message);
        });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-xs sm:max-w-sm">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const ToastItem = ({ toast, onRemove }: { toast: Toast, onRemove: () => void }) => {
    const icons: Record<ToastType, LucideIcon> = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info
    };

    const styles: Record<ToastType, string> = {
        success: "bg-emerald-50 border-emerald-100 text-emerald-800 shadow-emerald-50",
        error: "bg-rose-50 border-rose-100 text-rose-800 shadow-rose-50",
        info: "bg-sky-50 border-sky-100 text-sky-800 shadow-sky-50"
    };

    const iconStyles: Record<ToastType, string> = {
        success: "text-emerald-500",
        error: "text-rose-500",
        info: "text-sky-500"
    };

    const Icon = icons[toast.type];

    return (
        <div
            className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl transition-all duration-500 animate-in slide-in-from-right",
                styles[toast.type]
            )}
        >
            <div className={cn("mt-0.5 shrink-0", iconStyles[toast.type])}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold leading-tight">{toast.message}</p>
            </div>
            <button
                onClick={onRemove}
                className="shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5 active:scale-90"
            >
                <X className="h-4 w-4 opacity-40" />
            </button>
        </div>
    );
};
