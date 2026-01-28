"use client";

import React, { useEffect, useState } from 'react';
import { X, Calendar, Edit } from 'lucide-react';
import SessionForm from './SessionForm';

interface SessionModalProps {
    isOpen: boolean;
    sessionId?: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SessionModal({ isOpen, sessionId, onClose, onSuccess }: SessionModalProps) {
    const [renderParams, setRenderParams] = useState({ key: 0 });

    // Force re-mount of form when sessionId changes to ensuring clean state
    useEffect(() => {
        if (isOpen) {
            setRenderParams(prev => ({ key: prev.key + 1 }));
        }
    }, [isOpen, sessionId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 custom-scrollbar">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/80 px-6 py-4 backdrop-blur-md">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {sessionId ? (
                            <>
                                <Edit className="h-5 w-5 text-[#2D8CFF]" />
                                Edit Session
                            </>
                        ) : (
                            <>
                                <Calendar className="h-5 w-5 text-[#2D8CFF]" />
                                New Live Session
                            </>
                        )}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    <SessionForm
                        key={renderParams.key}
                        sessionId={sessionId || undefined}
                        onSuccess={() => {
                            onSuccess();
                            onClose();
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
