import { supabase } from '@/lib/supabase';
import { pusherServer } from '@/lib/pusher-server';

/**
 * Trigger a scheduled admin message if it matches the current video timestamp.
 * This is designed to be called from a server action or API route.
 * 
 * @param sessionId - The ID of the session
 * @param timestamp - The current video timestamp (in seconds)
 */
export const triggerScheduledMessage = async (sessionId: string, timestamp: number) => {
    try {
        // Find session
        const { data: session } = await supabase
            .from('sessions')
            .select('id, session_id')
            .eq('session_id', sessionId)
            .maybeSingle();

        let targetSession = session;
        if (!targetSession && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
            const { data: sessionUuid } = await supabase.from('sessions').select('id, session_id').eq('id', sessionId).maybeSingle();
            targetSession = sessionUuid;
        }

        if (!targetSession) {
            console.error(`Session not found: ${sessionId}`);
            return;
        }

        // Fetch unsent messages that are due
        const { data: messagesToTrigger, error } = await supabase
            .from('admin_messages')
            .select('*')
            .eq('session_id', targetSession.id)
            .lte('timestamp_offset', timestamp)
            .eq('sent', false);

        if (error || !messagesToTrigger || messagesToTrigger.length === 0) {
            return;
        }

        // Trigger events and mark as sent
        for (const msg of messagesToTrigger) {
            const messageData = {
                message: msg.message,
                sender: msg.sender_name || 'Admin',
                avatar: msg.sender_avatar || '',
                type: 'admin',
                timestamp: Date.now(),
            };

            // 1. Trigger Pusher (Real-time)
            await pusherServer.trigger(`session-${targetSession.session_id}`, 'new-message', messageData);

            // 2. Save to Chat History (Persistence)
            await supabase.from('chat_messages').insert({
                session_id: targetSession.id, // Use UUID for foreign key
                message: msg.message,
                sender_name: msg.sender_name || 'Admin',
                type: 'admin',
                // sender_id is optional/null for system admin messages or can use a system ID
            });

            // 3. Mark as sent in Admin Messages table
            await supabase
                .from('admin_messages')
                .update({ sent: true })
                .eq('id', msg.id);
        }

        console.log(`Triggered ${messagesToTrigger.length} admin messages for session ${sessionId}`);

    } catch (error) {
        console.error('Trigger Scheduled Message Error:', error);
    }
};
