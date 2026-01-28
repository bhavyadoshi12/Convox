"use client";

import { useEffect, useState, useCallback } from 'react';
import {
    Video,
    Search,
    Grid,
    List,
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    Clock,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { VideoCardSkeleton } from '@/components/ui/Skeletons';
import dynamic from 'next/dynamic';

const VideoCard = dynamic(() => import('@/components/admin/VideoCard'), { loading: () => <VideoCardSkeleton /> });
const VideoUploadModal = dynamic(() => import('@/components/admin/VideoUploadModal'));
const EditVideoModal = dynamic(() => import('@/components/admin/EditVideoModal'));
const VideoPlayerModal = dynamic(() => import('@/components/admin/VideoPlayerModal'));

interface VideoData {
    id: string;
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url: string;
    duration: number;
    source: 'supabase' | 'google_drive';
    uploadedBy: {
        id: string;
        name: string;
    };
    created_at: string;
}

export default function VideoLibraryPage() {
    const [videos, setVideos] = useState<VideoData[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'supabase' | 'google_drive'>('all');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 1
    });
    const [previewVideo, setPreviewVideo] = useState<VideoData | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const handlePlayVideo = (video: VideoData) => {
        setPreviewVideo(video);
        setIsPreviewOpen(true);
    };

    const fetchVideos = useCallback(async (page = 1, search = '', source = 'all') => {
        setLoading(true);
        try {
            let url = `/api/admin/videos?page=${page}&limit=${pagination.limit}&search=${search}`;
            if (source !== 'all') {
                url += `&source=${source}`;
            }
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setVideos(data.videos);
                setPagination(prev => ({
                    ...prev,
                    page: data.pagination.page,
                    total: data.pagination.total,
                    totalPages: data.pagination.totalPages
                }));
            }
        } catch (error) {
            console.error('Failed to fetch videos:', error);
        } finally {
            setLoading(false);
        }
    }, [pagination.limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchVideos(1, searchQuery, sourceFilter);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, sourceFilter, fetchVideos]);

    // ... (rest of the logic remains same, just ensure handleEdit and deleteVideo are correctly typed)

    const deleteVideo = useCallback(async (id: string) => {
        if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) return;

        try {
            const response = await fetch(`/api/admin/videos/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                fetchVideos(pagination.page, searchQuery, sourceFilter);
            } else {
                alert('Failed to delete video: ' + data.message);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('An error occurred while deleting the video.');
        }
    }, [pagination.page, searchQuery, sourceFilter, fetchVideos]);

    const handleEditVideo = (video: VideoData) => {
        setSelectedVideo(video);
        setIsEditModalOpen(true);
    };

    const formatDuration = useCallback((seconds: number) => {
        if (!seconds) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Video Library</h1>
                    <p className="text-gray-500">Manage and upload your course videos</p>
                </div>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2D8CFF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Video
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 gap-4 items-center max-w-2xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search videos..."
                            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select
                        className="rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-[#2D8CFF] focus:outline-none focus:ring-1 focus:ring-[#2D8CFF] bg-white min-w-[140px]"
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value as any)}
                    >
                        <option value="all">All Sources</option>
                        <option value="supabase">Supabase</option>
                        <option value="google_drive">Google Drive</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "rounded-md p-1.5 transition-all text-gray-500",
                            viewMode === 'grid' && "bg-gray-100 text-[#2D8CFF] shadow-sm"
                        )}
                    >
                        <Grid className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "rounded-md p-1.5 transition-all text-gray-500",
                            viewMode === 'list' && "bg-gray-100 text-[#2D8CFF] shadow-sm"
                        )}
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Videos View */}
            {loading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
                        <VideoCardSkeleton key={i} />
                    ))}
                </div>
            ) : videos.length > 0 ? (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {videos.map((video) => (
                                <VideoCard
                                    key={video.id}
                                    video={video}
                                    onDelete={deleteVideo}
                                    onEdit={handleEditVideo}
                                    onPlay={handlePlayVideo}
                                    formatDuration={formatDuration}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <table className="w-full text-left text-sm text-gray-500">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                                    <tr>
                                        <th className="px-6 py-3">Video</th>
                                        <th className="px-6 py-3">Source</th>
                                        <th className="px-6 py-3">Duration</th>
                                        <th className="px-6 py-3">Upload Date</th>
                                        <th className="px-6 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {videos.map((video) => (
                                        <tr key={video.id} className="group hover:bg-gray-50/50">
                                            <td className="px-6 py-4">
                                                <div
                                                    className="flex items-center gap-3 cursor-pointer group/item"
                                                    onClick={() => handlePlayVideo(video)}
                                                >
                                                    <div className="h-10 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100 relative">
                                                        <img
                                                            src={video.thumbnail_url || '/placeholder-thumb.jpg'}
                                                            className="h-full w-full object-cover transition-transform group-hover/item:scale-110"
                                                            alt=""
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                            <Play className="h-4 w-4 text-white fill-current" />
                                                        </div>
                                                    </div>
                                                    <span className="font-medium text-gray-900 group-hover/item:text-[#2D8CFF] transition-colors">{video.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                    video.source === 'google_drive'
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-blue-100 text-blue-800"
                                                )}>
                                                    {video.source === 'google_drive' ? 'Drive' : 'Supabase'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{formatDuration(video.duration)}</td>
                                            <td className="px-6 py-4">{new Date(video.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditVideo(video)}
                                                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteVideo(video.id)}
                                                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                            <p className="text-sm text-gray-500">
                                Showing <span className="font-medium text-gray-900">{videos.length}</span> of <span className="font-medium text-gray-900">{pagination.total}</span> videos
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={pagination.page <= 1}
                                    onClick={() => fetchVideos(pagination.page - 1, searchQuery, sourceFilter)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                {[...Array(pagination.totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => fetchVideos(i + 1, searchQuery, sourceFilter)}
                                        className={cn(
                                            "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                                            pagination.page === i + 1
                                                ? "border-[#2D8CFF] bg-[#2D8CFF] text-white"
                                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => fetchVideos(pagination.page + 1, searchQuery, sourceFilter)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20">
                    <div className="mb-4 rounded-full bg-gray-50 p-6">
                        <Video className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">No videos found</h3>
                    <p className="mb-6 max-w-xs text-center text-gray-500">
                        {searchQuery || sourceFilter !== 'all'
                            ? "No videos match your search or filter. Try adjusting them."
                            : "Start by adding your first course video."}
                    </p>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#2D8CFF] px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-600"
                    >
                        <Plus className="h-4 w-4" />
                        Add Video
                    </button>
                </div>
            )}

            {/* Modals */}
            <VideoUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={() => fetchVideos(1, searchQuery, sourceFilter)}
            />

            <EditVideoModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => fetchVideos(pagination.page, searchQuery, sourceFilter)}
                video={selectedVideo}
            />

            <VideoPlayerModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                video={previewVideo}
            />
        </div>
    );
}
