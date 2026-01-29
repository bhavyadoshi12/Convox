import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const { name, email: providedEmail, sessionId } = await req.json();

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, message: 'Name is required' },
                { status: 400 }
            );
        }

        // Generate identifiers
        const uniqueId = uuidv4();
        // Ensure email is unique to avoid collision if providedEmail is empty
        const email = providedEmail || `guest_${uniqueId.substring(0, 8)}@temp.guest`;
        const dummyPassword = `guest_${uniqueId}`;
        const passwordHash = await bcrypt.hash(dummyPassword, 10);

        // Persist Guest in DB to satisfy FK constraints for Chat/etc
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                name,
                email: email.toLowerCase(),
                password_hash: passwordHash,
                role: 'student', // Workaround: DB has a CHECK constraint allowing only 'student'/'admin'. We use 'student' here but issue a 'guest' token.
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&is_guest=true&session_id=${sessionId || ''}`
            })
            .select()
            .single();

        if (error) {
            console.error('Guest DB Creation Error:', error);
            // Fallback: If DB insert fails (e.g. email collision), try again or fail
            // For now, let's return error so we know.
            return NextResponse.json(
                {
                    success: false,
                    message: `Could not create guest session: ${error.message || JSON.stringify(error)}`,
                    details: error
                },
                { status: 500 }
            );
        }

        // Generate token with REAL Database ID
        const token = generateToken(newUser.id, newUser.email, 'guest', newUser.name);

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: 'guest'
            }
        });
    } catch (error) {
        console.error('Guest Login Error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
