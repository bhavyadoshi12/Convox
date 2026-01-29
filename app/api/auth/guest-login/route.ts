import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const { name, email: providedEmail } = await req.json();

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, message: 'Name is required' },
                { status: 400 }
            );
        }

        // Create a unique ID for the guest
        const guestId = `guest_${uuidv4()}`;
        const email = providedEmail || `${guestId}@guest.temp`; // Use provided email or dummy

        // Generate token with 'guest' role
        const token = generateToken(guestId, email, 'guest', name);

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: guestId,
                email,
                name,
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
