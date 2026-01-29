import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { pusherServer } from '@/lib/pusher-server';
import { UserPayload } from '@/lib/auth';

const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const body = await req.json();
        const { sessionId, isRaised } = body;

        if (!sessionId) {
            return NextResponse.json({ message: 'Session ID required' }, { status: 400 });
        }

        // Trigger Pusher Event
        await pusherServer.trigger(`session-${sessionId}`, 'client-hand-update', {
            userId: user.id,
            isRaised: !!isRaised
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Hand Raise Error:', error);
        return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
    }
};

export const POST = requireAuth(handler);
