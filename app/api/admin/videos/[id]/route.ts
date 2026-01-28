import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

// GET: Fetch Single Video
const getHandler = async (req: NextRequest, user: UserPayload, context: RouteContext) => {
    try {
        const { id } = await context.params;
        const { data: video, error } = await supabase
            .from('videos')
            .select('*, uploader:users!uploader_id(name, email)')
            .eq('id', id)
            .single();

        if (error || !video) {
            return NextResponse.json({ success: false, message: 'Video not found' }, { status: 404 });
        }

        // Map uploader to uploadedBy
        (video as any).uploadedBy = video.uploader;

        return NextResponse.json({ success: true, video }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: 'Server Error', error: error.message }, { status: 500 });
    }
};

// PUT: Update Video
const putHandler = async (req: NextRequest, user: UserPayload, context: RouteContext) => {
    try {
        const { id } = await context.params;
        const body = await req.json();
        const { title, description } = body;

        const updates: any = {};
        if (title) updates.title = title;
        if (description !== undefined) updates.description = description;

        const { data: video, error } = await supabase
            .from('videos')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error || !video) {
            return NextResponse.json({ success: false, message: 'Update Failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, video }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: 'Update Failed', error: error.message }, { status: 500 });
    }
};

// DELETE: Delete Video
const deleteHandler = async (req: NextRequest, user: UserPayload, context: RouteContext) => {
    try {
        const { id } = await context.params;
        // Fetch first to get video_url and thumbnail_url
        const { data: video } = await supabase
            .from('videos')
            .select('video_url, thumbnail_url')
            .eq('id', id)
            .single();

        if (!video) {
            return NextResponse.json({ success: false, message: 'Video not found' }, { status: 404 });
        }

        // 1. Delete files from Supabase Storage
        const filesToDelete: string[] = [];

        const extractPath = (url: string) => {
            try {
                // Supabase Public URL format: .../storage/v1/object/public/[bucket]/[path]
                const parts = url.split('/storage/v1/object/public/videos/');
                if (parts.length > 1) return parts[1];
                return null;
            } catch (e) {
                return null;
            }
        };

        if (video.video_url) {
            const path = extractPath(video.video_url);
            if (path) filesToDelete.push(path);
        }
        if (video.thumbnail_url) {
            const path = extractPath(video.thumbnail_url);
            if (path) filesToDelete.push(path);
        }

        if (filesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
                .from('videos')
                .remove(filesToDelete);

            if (storageError) {
                console.error('Failed to delete files from storage:', storageError);
            }
        }

        // 2. Delete associated sessions (Manual Cascade)
        const { error: sessionDeleteError } = await supabase
            .from('sessions')
            .delete()
            .eq('video_id', id);

        if (sessionDeleteError) {
            console.error('Failed to delete associated sessions:', sessionDeleteError);
        }

        // 3. Delete from Videos Table
        const { error } = await supabase.from('videos').delete().eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Video deleted' }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: 'Delete Failed', error: error.message }, { status: 500 });
    }
};

export const GET = requireAuth(getHandler, ['admin']);
export const PUT = requireAuth(putHandler, ['admin']);
export const DELETE = requireAuth(deleteHandler, ['admin']);
