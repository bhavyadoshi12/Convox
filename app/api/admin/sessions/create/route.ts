import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';

const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const body = await req.json();
        const { title, video_id, scheduled_start, adminMessages } = body;

        // 1. Basic Validation
        if (!title || !video_id || !scheduled_start) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Please provide title, video_id, and scheduled_start',
                },
                { status: 400 }
            );
        }

        // 2. Validate Scheduled Start
        const startTime = new Date(scheduled_start);
        if (isNaN(startTime.getTime())) {
            return NextResponse.json(
                { success: false, message: 'Invalid scheduled_start format' },
                { status: 400 }
            );
        }

        if (startTime <= new Date()) {
            return NextResponse.json(
                { success: false, message: 'Scheduled start time must be in the future' },
                { status: 400 }
            );
        }

        // 3. Find Video & Validate Duration
        const { data: video } = await supabase
            .from('videos')
            .select('title, duration, thumbnail_url, video_url')
            .eq('id', video_id)
            .single();

        if (!video) {
            return NextResponse.json(
                { success: false, message: 'Video not found' },
                { status: 404 }
            );
        }

        // 4. Validate Admin Messages
        if (adminMessages && Array.isArray(adminMessages)) {
            for (const msg of adminMessages) {
                if (
                    typeof msg.timestamp !== 'number' ||
                    msg.timestamp < 0 ||
                    msg.timestamp > video.duration
                ) {
                    return NextResponse.json(
                        {
                            success: false,
                            message: `Invalid message timestamp: ${msg.timestamp}. Video duration is ${video.duration}s`,
                        },
                        { status: 400 }
                    );
                }
                if (!msg.message) {
                    return NextResponse.json(
                        { success: false, message: 'Message content is required for admin messages' },
                        { status: 400 }
                    );
                }
            }
        }

        // 5. Create Session
        const { data: session, error } = await supabase
            .from('sessions')
            .insert({
                title,
                video_id,
                scheduled_start: startTime,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        // 6. Insert Admin Messages if any
        if (adminMessages && adminMessages.length > 0) {
            const messagesToInsert = adminMessages.map((msg: any) => ({
                session_id: session.id,
                message: msg.message,
                sender_name: msg.senderName || 'Admin',
                sender_avatar: msg.senderAvatar,
                sent: msg.sent || false,
                timestamp_offset: msg.timestamp
            }));

            const { error: msgError } = await supabase
                .from('admin_messages')
                .insert(messagesToInsert);

            if (msgError) {
                console.error('Failed to save admin messages:', msgError);
                // Non-fatal? Or rollback? For now log it.
            }

            (session as any).adminMessages = adminMessages;
        } else {
            (session as any).adminMessages = [];
        }

        // Construct Enriched Session
        const enrichedSession = {
            ...session,
            session_id: session.session_id || session.id,
            video_id: video, // Has title, thumbnail, duration, url
            adminMessages: (session as any).adminMessages
        };

        // Trigger Real-time Event
        const { pusherServer } = await import('@/lib/pusher-server');
        await pusherServer.trigger('sessions', 'session-created', enrichedSession);

        return NextResponse.json({ success: true, session: enrichedSession }, { status: 201 });
    } catch (error: any) {
        console.error('Create Session Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to create session', error: error.message },
            { status: 500 }
        );
    }
};

export const POST = requireAuth(handler, ['admin']);
