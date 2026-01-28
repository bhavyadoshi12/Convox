import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { pusherServer } from '@/lib/pusher-server';
import { UserPayload } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ApiError, handleApiError } from '@/lib/apiError';

// Rate Limiting (In-memory)
// Note: In serverless, this memory might reset, but it provides basic protection for hot instances.
const rateLimit = new Map<string, { count: number; startTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_MINUTE = 10;

const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const body = await req.json();
        const { sessionId, message, type } = body;

        // 1. Validation
        if (!sessionId || !message || !type) {
            throw ApiError.BadRequest('Missing required fields');
        }

        if (message.length > 500) {
            throw ApiError.BadRequest('Message too long (max 500 chars)');
        }

        if (type !== 'user' && type !== 'admin') {
            throw ApiError.BadRequest('Invalid message type');
        }

        // Role check: Only admin can send 'admin' type messages
        if (type === 'admin' && user.role !== 'admin') {
            throw ApiError.Forbidden('Only admins can send admin messages');
        }

        // 2. Rate Limiting
        const currentTime = Date.now();
        const userRate = rateLimit.get(user.id);

        if (userRate) {
            if (currentTime - userRate.startTime < RATE_LIMIT_WINDOW) {
                if (userRate.count >= MAX_MESSAGES_PER_MINUTE) {
                    throw new ApiError(429, 'Rate limit exceeded. Try again later.');
                }
                userRate.count++;
            } else {
                // Reset window
                rateLimit.set(user.id, { count: 1, startTime: currentTime });
            }
        } else {
            rateLimit.set(user.id, { count: 1, startTime: currentTime });
        }

        // 3. Save to Supabase
        const { supabaseAdmin } = await import('@/lib/supabase');
        const db = supabaseAdmin || supabase;

        // Fetch User Name (actual name instead of email prefix)
        const { data: userData } = await db
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single();

        const senderName = userData?.name || user.email?.split('@')[0] || 'User';

        console.log('--- CHAT SEND DEBUG ---');
        console.log('Input SessionId:', sessionId);

        // Resolve Session UUID safely
        // Use supabaseAdmin to bypass RLS for lookups (already imported)

        let sessionData;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId);
        console.log('Is UUID:', isUuid);

        if (isUuid) {
            const { data } = await db
                .from('sessions')
                .select('*') // Select all to be sure
                .eq('id', sessionId)
                .maybeSingle();
            sessionData = data;
            console.log('Resolved via UUID:', data ? 'Found' : 'Not Found');
        }

        if (!sessionData) {
            const { data } = await db
                .from('sessions')
                .select('*')
                .eq('session_id', sessionId)
                .maybeSingle();
            sessionData = data;
            console.log('Resolved via Slug:', data ? 'Found' : 'Not Found');
        }

        if (!sessionData) {
            console.error(`Session not found for ID/Slug: ${sessionId}`);
            throw ApiError.NotFound('Session not found');
        }

        console.log('Target Session ID (UUID):', sessionData.id);
        console.log('Target Session Slug:', sessionData.session_id);

        try {
            const { error } = await db.from('chat_messages').insert({
                session_id: sessionData.id, // Try UUID first
                message,
                sender_name: senderName,
                sender_id: user.id,
                type,
                avatar_url: '',
            });
            if (error) throw error;
        } catch (err: any) {
            // Fallback: If FK violation, maybe it WANTS the slug? (Unlikely but possible if schema changed)
            if (err.message && err.message.includes('foreign key constraint')) {
                console.warn('UUID insert failed FK, trying SLUG insert...');
                const { error: retryError } = await db.from('chat_messages').insert({
                    session_id: sessionData.session_id, // Try Slug
                    message,
                    sender_name: senderName,
                    sender_id: user.id,
                    type,
                    avatar_url: '',
                });
                if (retryError) throw retryError;
            } else {
                throw err;
            }
        }

        // 4. Trigger Pusher Event
        const eventData = {
            message,
            sender: senderName,
            avatar: '',
            type,
            timestamp: currentTime,
            userId: user.id
        };

        // We can trigger concurrently with DB save, but saving first ensures reliability
        await pusherServer.trigger(`session-${sessionId}`, 'new-message', eventData);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return handleApiError(error);
    }
};

export const POST = requireAuth(handler);
