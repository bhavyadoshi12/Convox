/**
 * Video Model Types for Supabase
 */

export type VideoSource = 'supabase' | 'google_drive';

export interface Video {
    id: string;
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url: string;
    duration: number | null;
    uploader_id: string;
    source: VideoSource;
    drive_file_id?: string;
    created_at: string;
    updated_at: string;
}

export interface VideoData extends Video {
    uploadedBy: {
        id: string;
        name: string;
    };
}
