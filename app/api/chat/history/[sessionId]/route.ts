import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';

interface RouteContext {
    params: {
        sessionId: string;
    };
}

const handler = async (req: NextRequest, user: UserPayload, context: RouteContext) => {
    try {
        const sessionId = context.params.sessionId;
        const searchParams = req.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');

        if (!sessionId) {
            return NextResponse.json(
                { success: false, message: 'Session ID is required' },
                { status: 400 }
            );
        }

        // Fetch messages sorted by timestamp descending (newest first)
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Reverse to return oldest first if client prefers chronological order of recent messages
        // Usually clients want chronological for display.
        const sortedMessages = (messages || []).reverse().map((msg: any) => ({
            id: msg.id,
            sender: msg.sender_name,
            message: msg.message,
            type: msg.type,
            timestamp: msg.created_at || msg.timestamp,
            userId: msg.sender_id,
            avatar: msg.avatar_url
        }));

        return NextResponse.json({ success: true, messages: sortedMessages }, { status: 200 });
    } catch (error: any) {
        console.error('Fetch Chat History Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch chat history', error: error.message },
            { status: 500 }
        );
    }
};

export const GET = requireAuth(handler);
