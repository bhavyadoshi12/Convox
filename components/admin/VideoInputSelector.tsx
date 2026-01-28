"use client";

import React, { useState } from 'react';
import { Upload, Link as LinkIcon, CheckCircle2, XCircle, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateDriveLink } from '@/lib/googleDrive';

interface VideoInputSelectorProps {
    mode: 'supabase' | 'google_drive';
    onModeSelect: (mode: 'supabase' | 'google_drive') => void;
    onFileSelect: (file: File | null) => void;
    onDriveLinkChange: (url: string, isValid: boolean, fileId: string | null) => void;
    disabled?: boolean;
}

export default function VideoInputSelector({
    mode,
    onModeSelect,
    onFileSelect,
    onDriveLinkChange,
    disabled
}: VideoInputSelectorProps) {
    const [driveUrl, setDriveUrl] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{ isValid: boolean; fileId: string | null } | null>(null);

    const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setDriveUrl(url);

        if (!url) {
            setValidationResult(null);
            onDriveLinkChange('', false, null);
            return;
        }

        setIsValidating(true);
        const result = await validateDriveLink(url);
        setIsValidating(false);
        setValidationResult(result);
        onDriveLinkChange(url, result.isValid, result.fileId);
    };

    const handleModeSwitch = (newMode: 'supabase' | 'google_drive') => {
        if (newMode === mode) return;

        // Reset opposite state
        if (newMode === 'supabase') {
            setDriveUrl('');
            setValidationResult(null);
            onDriveLinkChange('', false, null);
        } else {
            onFileSelect(null);
        }

        onModeSelect(newMode);
    };

    return (
        <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                    type="button"
                    onClick={() => handleModeSwitch('supabase')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all",
                        mode === 'supabase' ? "bg-white text-[#2D8CFF] shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                    disabled={disabled}
                >
                    <Upload className="h-4 w-4" />
                    Local Upload
                </button>
                <button
                    type="button"
                    onClick={() => handleModeSwitch('google_drive')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all",
                        mode === 'google_drive' ? "bg-white text-[#2D8CFF] shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                    disabled={disabled}
                >
                    <LinkIcon className="h-4 w-4" />
                    Google Drive Link
                </button>
            </div>

            {/* Content Area */}
            {mode === 'supabase' ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-bold">Local Upload</p>
                    {/* The parent container provides the file input UI */}
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                        <label htmlFor="driveUrl" className="mb-1.5 block text-sm font-semibold text-gray-700">
                            Google Drive Link
                        </label>
                        <div className="relative">
                            <input
                                id="driveUrl"
                                type="url"
                                placeholder="Paste Google Drive sharing link here..."
                                className={cn(
                                    "w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-1",
                                    validationResult?.isValid
                                        ? "border-green-200 bg-green-50/30 focus:border-green-500 focus:ring-green-500"
                                        : validationResult?.isValid === false
                                            ? "border-red-200 bg-red-50/30 focus:border-red-500 focus:ring-red-500"
                                            : "border-gray-200 focus:border-[#2D8CFF] focus:ring-[#2D8CFF]"
                                )}
                                value={driveUrl}
                                onChange={handleUrlChange}
                                disabled={disabled}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {isValidating && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                                {!isValidating && validationResult?.isValid && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                {!isValidating && validationResult?.isValid === false && <XCircle className="h-4 w-4 text-red-500" />}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="font-bold">Important Instructions:</p>
                            <ul className="list-disc ml-4 space-y-0.5">
                                <li>The file must be a <strong>Video</strong>.</li>
                                <li>Set permissions to: <strong>"Anyone with the link can view"</strong>.</li>
                                <li>Ensure the video is fully processed by Google.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
