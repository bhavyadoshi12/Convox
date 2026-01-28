import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';

const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const status = searchParams.get('status');

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Build query
        let query = supabase
            .from('sessions')
            .select(`
                *,
                video:videos!video_id(id, title, duration, thumbnail_url, video_url),
                creator:users!created_by(name, email),
                admin_messages(id, message, timestamp_offset, sender_name, sender_avatar, sent)
            `, { count: 'exact' });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: sessions, count, error } = await query
            .order('scheduled_start', { ascending: true })
            .range(from, to);

        if (error) throw error;

        // Auto-update status logic
        const updatedSessions = await Promise.all(
            (sessions || []).map(async (session: any) => {
                let isModified = false;
                const now = new Date();
                const startTime = new Date(session.scheduled_start);
                const videoDuration = session.video?.duration || 0;
                const endTime = new Date(startTime.getTime() + videoDuration * 1000);

                let newStatus = session.status;

                if (session.status === 'scheduled' && now >= startTime) {
                    if (now < endTime) {
                        newStatus = 'live';
                        isModified = true;
                    } else {
                        newStatus = 'ended';
                        isModified = true;
                    }
                } else if (session.status === 'live' && now >= endTime) {
                    newStatus = 'ended';
                    isModified = true;
                }

                if (isModified) {
                    await supabase.from('sessions').update({ status: newStatus }).eq('id', session.id);
                    session.status = newStatus;
                }

                // Map relationships to match frontend expectation if needed:
                return {
                    ...session,
                    video_id: session.video, // Mongoose populated 'video_id'
                    createdBy: session.creator,
                    adminMessages: (session.admin_messages || []).map((msg: any) => ({
                        ...msg,
                        timestamp: msg.timestamp_offset
                    }))
                };
            })
        );

        return NextResponse.json(
            {
                success: true,
                sessions: updatedSessions,
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
        console.error('Fetch Sessions Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch sessions', error: error.message },
            { status: 500 }
        );
    }
};

export const GET = requireAuth(handler, ['admin']);
