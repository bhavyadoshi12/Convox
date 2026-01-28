import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';

const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const [
            { count: totalVideos },
            { count: liveSessions },
            { count: scheduledSessions },
            { count: totalStudents },
            { data: recentSessions }
        ] = await Promise.all([
            supabase.from('videos').select('*', { count: 'exact', head: true }),
            supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'live'),
            supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
            supabase.from('sessions')
                .select('*, video:videos!video_id(title, thumbnail_url)')
                .order('scheduled_start', { ascending: true })
                .range(0, 4) // Limit 5
        ]);

        return NextResponse.json(
            {
                success: true,
                stats: {
                    totalVideos: totalVideos || 0,
                    liveSessions: liveSessions || 0,
                    scheduledSessions: scheduledSessions || 0,
                    totalStudents: totalStudents || 0,
                },
                recentSessions: recentSessions?.map(s => ({
                    ...s,
                    video_id: s.video // Map for compatibility
                })) || []
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Stats Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch stats', error: error.message },
            { status: 500 }
        );
    }
};

export const GET = requireAuth(handler, ['admin']);
