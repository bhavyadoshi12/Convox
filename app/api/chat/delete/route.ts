import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { supabase } from '@/lib/supabase';
import { pusherServer } from '@/lib/pusher-server';
import { UserPayload } from '@/lib/auth';

const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const { messageId, sessionId } = await req.json();

        if (user.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        if (!messageId || !sessionId) {
            return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
        }

        // Delete from DB
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;

        // Trigger Pusher Event
        await pusherServer.trigger(`session-${sessionId}`, 'message-deleted', {
            messageId
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Message Error:', error);
        return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
    }
};

export const POST = requireAuth(handler, ['admin']);
