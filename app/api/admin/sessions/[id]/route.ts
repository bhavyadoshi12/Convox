import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

// Helper to cleanup guests
async function deleteSessionGuests(sessionId: string) {
    if (!sessionId) return;
    try {
        // Find users with matching session_id in avatar_url
        // Using ilike for pattern matching
        const { error } = await supabase
            .from('users')
            .delete()
            .ilike('avatar_url', `%session_id=${sessionId}%`); // Matches the tag we added

        if (error) {
            console.error('Guest Cleanup Error:', error);
        } else {
            console.log(`Cleaned up guests for session ${sessionId}`);
        }
    } catch (err) {
        console.error('Guest Cleanup Exception:', err);
    }
}

const handler = async (req: NextRequest, user: UserPayload, context: RouteContext) => {
    try {
        const { id } = await context.params;
        const body = await req.json();
        const { title, scheduled_start, adminMessages, status } = body; // Destructure status

        // Fetch Session
        const { data: session, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('session_id', id) // Try querying by session_id (string)
            .maybeSingle();

        let targetSession = session;

        // If not found by string ID, try UUID (fallback logic from original code)
        if (!targetSession && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            const { data: sessionUuid } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            targetSession = sessionUuid;
        }

        if (!targetSession) {
            return NextResponse.json(
                { success: false, message: 'Session not found' },
                { status: 404 }
            );
        }

        const updates: any = {};

        // Explicit status update handling
        if (status) {
            updates.status = status;
            // If ending session, cleanup guests
            if (status === 'ended') {
                await deleteSessionGuests(targetSession.session_id);
            }
        }

        // Update Title
        if (title) updates.title = title;

        // Update Scheduled Start
        if (scheduled_start) {
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
            updates.scheduled_start = startTime;
            updates.status = 'scheduled'; // Reset status
        }

        // Update Admin Messages
        if (adminMessages) {
            if (!Array.isArray(adminMessages)) {
                return NextResponse.json(
                    { success: false, message: 'adminMessages must be an array' },
                    { status: 400 }
                );
            }

            // Need video duration
            const { data: video } = await supabase
                .from('videos')
                .select('duration')
                .eq('id', targetSession.video_id)
                .single();

            if (!video) {
                return NextResponse.json(
                    { success: false, message: 'Associated video not found' },
                    { status: 404 }
                );
            }

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

            // Rewrite messages: Delete old, insert new.
            // Note: This isn't atomic without a transaction (RPC), but acceptable for MVP migration.
            await supabase.from('admin_messages').delete().eq('session_id', targetSession.id);

            const messagesToInsert = adminMessages.map((msg: any) => ({
                session_id: targetSession.id,
                message: msg.message,
                sender_name: msg.senderName || 'Admin',
                sender_avatar: msg.senderAvatar,
                sent: msg.sent || false,
                timestamp_offset: msg.timestamp
            }));

            await supabase.from('admin_messages').insert(messagesToInsert);

            // We don't verify insert error here to mimic original logic flow, but ideally should.
        }

        if (Object.keys(updates).length > 0) {
            const { data: updatedSession, error: updateError } = await supabase
                .from('sessions')
                .update(updates)
                .eq('id', targetSession.id)
                .select()
                .single();

            if (updateError) throw updateError;
            targetSession = updatedSession;
        }

        // Fetch associated video details for enriched response
        const { data: videoData } = await supabase
            .from('videos')
            .select('title, duration, thumbnail_url, video_url')
            .eq('id', targetSession.video_id)
            .single();

        const enrichedSession = {
            ...targetSession,
            session_id: targetSession.session_id || targetSession.id,
            video_id: videoData || { title: 'Unknown', thumbnail_url: '', duration: 0 },
            adminMessages: adminMessages || []
        };

        // Trigger Real-time Event
        const { pusherServer } = await import('@/lib/pusher-server');
        // If status changed to ended, trigger specific event if needed, but generic update handles it for now
        await pusherServer.trigger('sessions', 'session-updated', enrichedSession);

        return NextResponse.json({ success: true, session: enrichedSession }, { status: 200 });
    } catch (error: any) {
        console.error('Update Session Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to update session', error: error.message },
            { status: 500 }
        );
    }
};

// DELETE: Delete Session (Only if scheduled)
const deleteHandler = async (req: NextRequest, user: UserPayload, context: RouteContext) => {
    try {
        const { id } = await context.params;
        const { data: session } = await supabase
            .from('sessions')
            .select('*')
            .eq('session_id', id)
            .maybeSingle();

        let targetSession = session;
        if (!targetSession && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            const { data: sessionUuid } = await supabase.from('sessions').select('*').eq('id', id).maybeSingle();
            targetSession = sessionUuid;
        }

        if (!targetSession) {
            return NextResponse.json(
                { success: false, message: 'Session not found' },
                { status: 404 }
            );
        }

        // Cleanup Guests associated with this session before deleting session
        // (Using session_id which is the public ID usually used by guests)
        if (targetSession.session_id) {
            await deleteSessionGuests(targetSession.session_id);
        }

        // Allow deleting any session regardless of status
        // if (targetSession.status !== 'scheduled') { ... }

        // Manual Cascade: Delete related messages first
        await supabase.from('admin_messages').delete().eq('session_id', targetSession.id);
        await supabase.from('chat_messages').delete().eq('session_id', targetSession.id);

        const { error } = await supabase.from('sessions').delete().eq('id', targetSession.id);
        if (error) throw error;

        // Trigger Real-time Event
        const { pusherServer } = await import('@/lib/pusher-server');
        await pusherServer.trigger('sessions', 'session-deleted', {
            id: targetSession.session_id, // Use the slug/public ID
            uuid: targetSession.id // Also send UUID just in case
        });

        return NextResponse.json({ success: true, message: 'Session deleted' }, { status: 200 });
    } catch (error: any) {
        console.error('Delete Session Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to delete session', error: error.message },
            { status: 500 }
        );
    }
};

export const PUT = requireAuth(handler, ['admin']);
export const DELETE = requireAuth(deleteHandler, ['admin']);
