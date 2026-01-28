import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';
import { extractDriveFileId, generateDirectLink, generateThumbnailLink } from '@/lib/googleDrive';

const MAX_FILE_SIZE = 2000 * 1024 * 1024; // 2GB
const ALLOWED_FILE_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']; // mp4, mov, avi

const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const contentType = req.headers.get('content-type') || '';

        // Handle Google Drive Link (JSON payload)
        if (contentType.includes('application/json')) {
            const body = await req.json();
            const { title, description, driveUrl, mode, duration, videoPath, thumbnailPath } = body;

            // Handle Supabase Direct Upload Finalization
            if (mode === 'supabase_direct') {
                if (!videoPath) {
                    return NextResponse.json(
                        { success: false, message: 'Video path required' },
                        { status: 400 }
                    );
                }

                // 4. Get Public Video URL (already uploaded)
                const { data: videoPublicData } = supabaseAdmin.storage.from('videos').getPublicUrl(videoPath);
                const videoUrl = videoPublicData.publicUrl;

                // Handle Thumbnail (if uploaded client-side or we need to upload it here? For simplicity, we might still upload thumbnail via formData or client-side. 
                // Let's assume thumbnail is also uploaded client-side or handled separately. 
                // However, the client might send thumbnail as a separate file?
                // Simplest: Client uploads thumbnail via signed URL too, OR client sends thumbnail as base64?
                // Actually, the current modal generates thumbnail. 
                // Let's assume for now the user uploads video via signed URL, and maybe thumbnail via same way?
                // Or we can keep thumbnail upload here if it's small? 
                // If the thumbnail is small (<4MB), we can send it as base64 in JSON or separate request?
                // Let's check how we handle thumbnail.

                // Let's look at the usage.

                let finalThumbnailUrl = '';
                if (thumbnailPath) {
                    const { data: thumbPublicData } = supabaseAdmin.storage.from('videos').getPublicUrl(thumbnailPath);
                    finalThumbnailUrl = thumbPublicData.publicUrl;
                }

                // Save to Database
                const { data: video, error: dbError } = await supabaseAdmin
                    .from('videos')
                    .insert({
                        title,
                        description,
                        video_url: videoUrl,
                        thumbnail_url: finalThumbnailUrl || '',
                        duration: Math.round(Number(duration)) || 0,
                        uploader_id: user.id,
                        source: 'supabase',
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
            }

            if (mode === 'google_drive') {
                const fileId = extractDriveFileId(driveUrl);
                if (!fileId) {
                    return NextResponse.json(
                        { success: false, message: 'Invalid Google Drive URL' },
                        { status: 400 }
                    );
                }

                console.log('Inserting GDrive Video:', { title, driveUrl, fileId, duration });
                const { data: video, error: dbError } = await supabaseAdmin
                    .from('videos')
                    .insert({
                        title,
                        description,
                        video_url: generateDirectLink(fileId),
                        thumbnail_url: generateThumbnailLink(fileId),
                        duration: duration || 0,
                        uploader_id: user.id,
                        source: 'google_drive',
                        drive_file_id: fileId
                    })
                    .select()
                    .single();

                if (dbError) {
                    console.error('GDrive DB Insert Error:', dbError);
                    throw dbError;
                }

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
            }
        }

        // Handle Supabase Upload (FormData)
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
                source: 'supabase'
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
