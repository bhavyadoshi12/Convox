import React from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import JoinSessionClient from '@/components/student/JoinSessionClient';
import { supabaseAdmin } from '@/lib/supabase';

type Props = {
    params: Promise<{ sessionId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Fetch session data helper
async function getSession(sessionId: string) {
    // Try finding by custom ID first
    let { data: session, error } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

    if (error || !session) {
        // Fallback to UUID match
        const { data: sessionBackup, error: errorBackup } = await supabaseAdmin
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        session = sessionBackup;
    }

    return session;
}

export async function generateMetadata(
    { params, searchParams }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { sessionId } = await params;
    const session = await getSession(sessionId);

    if (!session) {
        return {
            title: 'Session Not Found | Convox',
            description: 'The live session you are looking for does not exist or has ended.',
        };
    }

    // Default thumbnails
    const defaultThumbnail = 'https://convox.vercel.app/og-image.jpg'; // Updated URL
    const sessionThumbnail = session.video_id?.thumbnail_url || session.thumbnail_url || defaultThumbnail;

    return {
        title: `Join Live: ${session.title} | Convox`,
        description: `Join this live interactive session scheduled for ${new Date(session.scheduled_start).toLocaleString()}. Click to watch and chat!`,
        openGraph: {
            title: `🔴 LIVE: ${session.title}`,
            description: `Join the conversation on Convox. Starting: ${new Date(session.scheduled_start).toLocaleTimeString()}`,
            url: `https://convox.vercel.app/join/${sessionId}`,
            siteName: 'Convox',
            images: [
                {
                    url: sessionThumbnail,
                    width: 1200,
                    height: 630,
                    alt: session.title,
                },
            ],
            locale: 'en_US',
            type: 'video.other',
        },
        twitter: {
            card: 'summary_large_image',
            title: `🔴 LIVE: ${session.title}`,
            description: `Join the live session now!`,
            images: [sessionThumbnail],
        },
    };
}

export default async function JoinSessionPage({ params }: Props) {
    const { sessionId } = await params;
    return <JoinSessionClient sessionId={sessionId} />;
}
