import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';

const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Build query
        let query = supabase
            .from('videos')
            .select('*, uploader:users!uploader_id(name, email)', { count: 'exact' });

        if (search) {
            query = query.ilike('title', `%${search}%`);
        }

        const { data: videos, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const mappedVideos = videos?.map(v => ({
            ...v,
            uploadedBy: v.uploader
        })) || [];

        return NextResponse.json(
            {
                success: true,
                videos: mappedVideos,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Fetch Videos Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch videos', error: error.message },
            { status: 500 }
        );
    }
};

export const GET = requireAuth(handler, ['admin']);
