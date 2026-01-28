import { NextRequest, NextResponse } from 'next/server';
import { triggerScheduledMessage } from '@/lib/triggerAdminMessage';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
        }

        const { sessionId, timestamp } = await req.json();

        if (!sessionId || timestamp === undefined) {
            return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
        }

        // Call the library function to handle logic
        await triggerScheduledMessage(sessionId, Math.floor(timestamp));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Trigger Admin Message Route Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
