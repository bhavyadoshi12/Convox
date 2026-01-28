import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher-server';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const userData = getAuthUser(req);
        if (!userData) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const socketId = formData.get('socket_id') as string;
        const channelName = formData.get('channel_name') as string;

        if (!socketId || !channelName) {
            return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
        }

        // Presence channel data
        const presenceData = {
            user_id: userData.id,
            user_info: {
                name: userData.email?.split('@')[0] || 'User',
                email: userData.email,
                role: userData.role
            }
        };

        // Authenticate the channel
        const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);

        return NextResponse.json(authResponse);
    } catch (error) {
        console.error('Pusher Auth Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
