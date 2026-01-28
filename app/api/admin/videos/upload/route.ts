import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';

const MAX_FILE_SIZE = 2000 * 1024 * 1024; // 2GB
const ALLOWED_FILE_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']; // mp4, mov, avi



const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const formData = await req.formData();
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const videoFile = formData.get('video') as File;
        const thumbnailFile = formData.get('thumbnail') as File;
        const durationStr = formData.get('duration') as string;

        // Validation
        if (!title || !videoFile) {
            return NextResponse.json(
                { success: false, message: 'Please provide title and video file' },
                { status: 400 }
            );
        }

        if (!ALLOWED_FILE_TYPES.includes(videoFile.type)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid file type. Only MP4, MOV, and AVI are allowed.',
                },
                { status: 400 }
            );
        }

        // 1. Prepare Paths
        const timestamp = Date.now();
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const videoPath = `uploads/${timestamp}_${sanitizedTitle}_video.${videoFile.name.split('.').pop()}`;
        const thumbPath = `uploads/${timestamp}_${sanitizedTitle}_thumb.jpg`;

        // 2. Upload Video to Supabase Storage
        const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
        const { error: videoUploadError } = await supabaseAdmin
            .storage
            .from('videos')
            .upload(videoPath, videoBuffer, {
                contentType: videoFile.type,
                upsert: false
            });

        if (videoUploadError) throw new Error(`Video upload failed: ${videoUploadError.message}`);

        // 3. Upload Thumbnail (if provided)
        let finalThumbnailUrl = '';
        if (thumbnailFile) {
            const thumbBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
            const { error: thumbUploadError } = await supabaseAdmin
                .storage
                .from('videos')
                .upload(thumbPath, thumbBuffer, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (thumbUploadError) console.warn('Thumbnail upload failed:', thumbUploadError);

            const { data: thumbPublicData } = supabaseAdmin.storage.from('videos').getPublicUrl(thumbPath);
            finalThumbnailUrl = thumbPublicData.publicUrl;
        }

        // 4. Get Public Video URL
        const { data: videoPublicData } = supabaseAdmin.storage.from('videos').getPublicUrl(videoPath);
        const videoUrl = videoPublicData.publicUrl;

        // 5. Save to Database
        const { data: video, error: dbError } = await supabaseAdmin
            .from('videos')
            .insert({
                title,
                description,
                video_url: videoUrl,
                thumbnail_url: finalThumbnailUrl || '', // Fallback to empty if upload failed
                duration: Math.round(parseFloat(durationStr) || 0),
                uploader_id: user.id,
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json(
            {
                success: true,
                video: {
                    id: video.id,
                    title: video.title,
                    video_url: video.video_url,
                    thumbnail_url: video.thumbnail_url,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Video Upload Error:', error);
        return NextResponse.json(
            { success: false, message: 'Upload Failed', error: error.message },
            { status: 500 }
        );
    }
};

// Wrap handler with authentication middleware
export const POST = requireAuth(handler, ['admin']);
