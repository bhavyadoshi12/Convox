import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher-server';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        // Authenticate admin
        const userData = getAuthUser(req);
        if (!userData || userData.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { channel, event, data } = await req.json();

        if (!channel || !event) {
            return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
        }

        await pusherServer.trigger(channel, event, data);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Pusher Trigger Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
