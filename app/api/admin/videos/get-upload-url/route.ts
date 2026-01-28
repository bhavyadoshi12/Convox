import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';

const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const body = await req.json();
        const { filename, fileType } = body;

        if (!filename || !fileType) {
            return NextResponse.json({ success: false, message: 'Filename and fileType are required' }, { status: 400 });
        }

        const timestamp = Date.now();
        const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const path = `uploads/${timestamp}_${sanitizedFilename}.${fileType.split('/')[1]}`;

        // Create a signed upload URL (valid for 15 minutes)
        const { data, error } = await supabaseAdmin
            .storage
            .from('videos')
            .createSignedUploadUrl(path);

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            signedUrl: data.signedUrl,
            path: data.path,
            token: data.token, // Some providers need this, but signedUrl usually includes it
            fullPath: path // Easier reference for client
        });

    } catch (error: any) {
        console.error('Get Upload URL Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
};

export const POST = requireAuth(handler, ['admin']);
