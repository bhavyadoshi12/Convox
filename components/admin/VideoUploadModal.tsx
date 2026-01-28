import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileVideo, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import VideoInputSelector from './VideoInputSelector';
import { extractDriveFileId, generateDirectLink, generateEmbedLink, generateThumbnailLink } from '@/lib/googleDrive';

interface VideoUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function VideoUploadModal({ isOpen, onClose, onSuccess }: VideoUploadModalProps) {
    const [mode, setMode] = useState<'supabase' | 'google_drive'>('supabase');
    const [file, setFile] = useState<File | null>(null);
    const [driveUrl, setDriveUrl] = useState('');
    const [isDriveValid, setIsDriveValid] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [duration, setDuration] = useState<number>(0);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isDetectingDuration, setIsDetectingDuration] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setDriveUrl('');
            setIsDriveValid(false);
            setMode('supabase');
            setTitle('');
            setDescription('');
            setUploading(false);
            setProgress(0);
            setError(null);
            setIsSuccess(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        validateAndSetFile(selectedFile);
    };

    const validateAndSetFile = (selectedFile?: File) => {
        if (!selectedFile) return;

        const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo']; // mp4, mov, avi
        const maxSize = 100 * 1024 * 1024; // 100MB (Local Upload Limit)

        if (!validTypes.includes(selectedFile.type)) {
            setError('Invalid file type. Please upload MP4, MOV, or AVI.');
            return;
        }

        if (selectedFile.size > maxSize) {
            setError('File size too large. Maximum limit is 100MB.');
            return;
        }

        // Generate thumbnail and get duration
        generateMetadata(selectedFile);

        setFile(selectedFile);
        setError(null);
        if (!title) {
            setTitle(selectedFile.name.split('.')[0]); // Default title to filename
        }
    };

    const generateMetadata = (videoSource: File | string) => {
        setIsDetectingDuration(true);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.crossOrigin = 'anonymous'; // Important for cross-origin Drive links

        // Add a timeout for detection
        const detectionTimeout = setTimeout(() => {
            if (isDetectingDuration) {
                setIsDetectingDuration(false);
                console.warn("Duration detection timed out. This often happens for large Google Drive files (>100MB) due to virus scan warnings.");
                if (typeof videoSource !== 'string') {
                    window.URL.revokeObjectURL(video.src);
                }
            }
        }, 10000);

        video.onloadedmetadata = () => {
            clearTimeout(detectionTimeout);
            setIsDetectingDuration(false);
            if (typeof videoSource !== 'string') {
                window.URL.revokeObjectURL(video.src);
            }
            setDuration(video.duration);
            if (video.duration < 1) {
                video.currentTime = 0;
            } else {
                video.currentTime = 1;
            }
        };

        video.onseeked = () => {
            // Only generate thumbnails for local files
            if (typeof videoSource !== 'string') {
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 360;
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const thumbnailFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
                            setThumbnail(thumbnailFile);
                        }
                    }, 'image/jpeg', 0.8);
                }
            }
        };

        video.onerror = () => {
            clearTimeout(detectionTimeout);
            setIsDetectingDuration(false);
            if (typeof videoSource === 'string') {
                console.warn("Google Drive blocked the metadata probe. Possible reasons: File > 100MB, restricted permissions, or browser CORS policy.");
            } else {
                console.warn("Failed to load video metadata for duration detection");
            }
        };

        video.src = typeof videoSource === 'string' ? videoSource : URL.createObjectURL(videoSource);
    };

    const detectDurationFromServer = async (fileId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/videos/detect-duration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fileId })
            });
            const data = await response.json();
            if (data.success && data.duration > 0) {
                setDuration(data.duration);
                return true;
            }
        } catch (err) {
            console.error('Server-side detection error:', err);
        }
        return false;
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFile = e.dataTransfer.files?.[0];
        validateAndSetFile(droppedFile);
    };

    const handleDriveLinkChange = (url: string, isValid: boolean) => {
        setDriveUrl(url);
        setIsDriveValid(isValid);

        if (isValid) {
            const fileId = extractDriveFileId(url);
            if (fileId) {
                setIsDetectingDuration(true);

                // Try both methods: client-side probe and server-side scraping
                // We don't await client-side because it's non-blocking, but we manage state
                generateMetadata(generateDirectLink(fileId));

                // Fallback/Parallel check on server
                detectDurationFromServer(fileId).finally(() => {
                    setIsDetectingDuration(false);
                });
            }

            if (!title) {
                // Can't easily get title from Drive link, but we can clear error
                setError(null);
            }
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'supabase' && (!file || !title)) return;
        if (mode === 'google_drive' && (!driveUrl || !isDriveValid || !title)) return;

        setUploading(true);
        setError(null);
        setProgress(0);

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        if (mode === 'google_drive') {
            try {
                const response = await fetch('/api/admin/videos/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title,
                        description,
                        driveUrl,
                        mode: 'google_drive',
                        duration
                    })
                });

                const data = await response.json();
                setUploading(false);

                if (data.success) {
                    setIsSuccess(true);
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 1500);
                } else {
                    setError(data.error || data.message || 'Upload failed');
                }
            } catch (err) {
                setUploading(false);
                setError('An error occurred during submission.');
            }
            return;
        }

        // Supabase Mode (Existing XHR logic)
        const formData = new FormData();
        formData.append('video', file!);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('duration', duration.toString());
        if (thumbnail) {
            formData.append('thumbnail', thumbnail);
        }

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setProgress(percent);
            }
        });

        xhr.addEventListener('load', () => {
            setUploading(false);
            if (xhr.status >= 200 && xhr.status < 300) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    setIsSuccess(true);
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 1500);
                } else {
                    setError(response.message || 'Upload failed');
                }
            } else {
                setError('Upload failed with status ' + xhr.status);
            }
        });

        xhr.addEventListener('error', () => {
            setUploading(false);
            setError('An error occurred during upload.');
        });

        xhr.open('POST', '/api/admin/videos/upload');
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
    };

    const isSubmitDisabled = mode === 'supabase'
        ? (!file || !title || uploading)
        : (!driveUrl || !isDriveValid || !title || uploading || duration <= 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-900">Add Video</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        disabled={uploading}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleUpload} className="p-6 space-y-6">
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center animate-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-4 rounded-full bg-green-100 p-4">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Success!</h3>
                            <p className="text-gray-500">Your video has been added to the library.</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <VideoInputSelector
                                mode={mode}
                                onModeSelect={setMode}
                                onFileSelect={(f) => {
                                    if (f) validateAndSetFile(f);
                                    else setFile(null);
                                }}
                                onDriveLinkChange={(url, isValid, fileId) => handleDriveLinkChange(url, isValid)}
                                disabled={uploading}
                            />

                            {/* File Input Area - Only show in Supabase mode if no file */}
                            {mode === 'supabase' && !file && (
                                <div
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 transition-all hover:border-[#2D8CFF] hover:bg-white cursor-pointer"
                                >
                                    <input
                                        type="file"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="video/mp4,video/quicktime,video/x-msvideo"
                                    />
                                    <div className="mb-4 rounded-full bg-white p-4 shadow-sm group-hover:scale-110 transition-transform">
                                        <Upload className="h-8 w-8 text-[#2D8CFF]" />
                                    </div>
                                    <p className="mb-1 font-semibold text-gray-900">Click to upload or drag and drop</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">MP4, MOV, or AVI (Max 100MB)</p>
                                </div>
                            )}

                            {/* File Display - Only show in Supabase mode if file exists */}
                            {mode === 'supabase' && file && (
                                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <div className="rounded-lg bg-[#2D8CFF]/10 p-3">
                                        <FileVideo className="h-8 w-8 text-[#2D8CFF]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate font-semibold text-gray-900">{file.name}</p>
                                        <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFile(null)}
                                        className="text-gray-400 hover:text-red-500"
                                        disabled={uploading}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            )}

                            {/* Metadata Inputs */}
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="title" className="mb-1.5 block text-sm font-semibold text-gray-700">Video Title *</label>
                                    <input
                                        id="title"
                                        type="text"
                                        required
                                        placeholder="Enter a descriptive title"
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        disabled={uploading}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="description" className="mb-1.5 block text-sm font-semibold text-gray-700">Description (Optional)</label>
                                    <textarea
                                        id="description"
                                        rows={3}
                                        placeholder="Provide a brief overview of the video content"
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF] resize-none"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        disabled={uploading}
                                    />
                                </div>

                                {mode === 'google_drive' && (
                                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300 rounded-xl bg-gray-50/50 p-4 border border-blue-100">
                                        <div className="col-span-2 text-xs font-bold text-blue-600 uppercase mb-1 flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <Info className="h-3 w-3" />
                                                Manual Duration (Required for Sync)
                                            </div>
                                            {isDetectingDuration && (
                                                <div className="flex items-center gap-1.5 text-[#2D8CFF] animate-pulse">
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    Detecting...
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Minutes</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0M"
                                                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                                                value={Math.floor(duration / 60) || ''}
                                                onChange={(e) => {
                                                    const mins = parseInt(e.target.value) || 0;
                                                    const secs = duration % 60;
                                                    setDuration(mins * 60 + secs);
                                                }}
                                                disabled={uploading}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Seconds</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                placeholder="0S"
                                                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                                                value={duration % 60 || ''}
                                                onChange={(e) => {
                                                    const secs = parseInt(e.target.value) || 0;
                                                    const mins = Math.floor(duration / 60);
                                                    setDuration(mins * 60 + (secs % 60));
                                                }}
                                                disabled={uploading}
                                            />
                                        </div>
                                        <p className="col-span-2 text-[10px] text-gray-400 mt-1 italic">
                                            Google doesn't share video length automatically. Please enter it manually to make sure the sync works.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar & Actions */}
                            <div className="space-y-4 border-t pt-6">
                                {uploading && mode === 'supabase' && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <span className="text-gray-500">Uploading...</span>
                                            <span className="text-[#2D8CFF]">{progress}%</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className="h-full bg-[#2D8CFF] transition-all duration-300"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                                {uploading && mode === 'google_drive' && (
                                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin text-[#2D8CFF]" />
                                        <span>Adding video link...</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={uploading}
                                        className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitDisabled}
                                        className="flex-1 rounded-lg bg-[#2D8CFF] py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 disabled:opacity-50 disabled:grayscale"
                                    >
                                        {uploading ? (mode === 'supabase' ? 'Uploading...' : 'Processing...') : 'Add Video'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
