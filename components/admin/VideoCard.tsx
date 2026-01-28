import React, { memo, useMemo } from 'react';
import { Video, Calendar, Edit, Trash2, Play } from 'lucide-react';
import Image from 'next/image';

interface VideoData {
    id: string;
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url: string;
    duration: number;
    uploadedBy: {
        id: string;
        name: string;
    };
    created_at: string;
}

interface VideoCardProps {
    video: VideoData;
    onDelete: (id: string) => void;
    onEdit?: (video: VideoData) => void;
    onPlay?: (video: VideoData) => void;
    formatDuration: (seconds: number) => string;
}

const VideoCard = ({ video, onDelete, onEdit, onPlay, formatDuration }: VideoCardProps) => {
    const formattedDate = useMemo(() => {
        return new Date(video.created_at).toLocaleDateString();
    }, [video.created_at]);

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-[#2D8CFF] hover:shadow-md">
            <div
                className="relative aspect-video w-full flex-shrink-0 bg-gray-100 cursor-pointer overflow-hidden"
                onClick={() => onPlay && onPlay(video)}
            >
                {video.thumbnail_url ? (
                    <Image
                        src={video.thumbnail_url}
                        alt={video.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <Video className="h-8 w-8 text-gray-300" />
                    </div>
                )}

                {/* Play Overlay */}
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <div className="rounded-full bg-[#2D8CFF] p-3 text-white opacity-0 shadow-lg transition-all translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                        <Play className="h-6 w-6 fill-current" />
                    </div>
                </div>

                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white z-20">
                    {formatDuration(video.duration)}
                </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-1 line-clamp-1 font-semibold text-gray-900 group-hover:text-[#2D8CFF]">
                    {video.title}
                </h3>
                <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1.5 tracking-tight">
                        <Calendar className="h-3 w-3" />
                        {formattedDate}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onEdit && onEdit(video)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        >
                            <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete(video.id)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(VideoCard);
