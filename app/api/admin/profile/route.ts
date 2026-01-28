import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: Fetch current user profile
const getHandler = async (req: NextRequest, user: UserPayload) => {
    try {
        const { data: profile, error } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            user: profile
        });
    } catch (error: any) {
        console.error('Fetch Profile Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch profile', error: error.message },
            { status: 500 }
        );
    }
};

// PUT: Update profile
const putHandler = async (req: NextRequest, user: UserPayload) => {
    try {
        const body = await req.json();
        const { name, email, currentPassword, newPassword } = body;

        const updates: any = {};
        if (name) updates.name = name;
        if (email) updates.email = email.toLowerCase();

        // Handle Password Change
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json(
                    { success: false, message: 'Current password is required to set a new password' },
                    { status: 400 }
                );
            }

            // Verify current password
            const { data: currentUser, error: fetchError } = await supabase
                .from('users')
                .select('password_hash')
                .eq('id', user.id)
                .single();

            if (fetchError || !currentUser) {
                throw new Error('User not found');
            }

            const isMatch = await bcrypt.compare(currentPassword, currentUser.password_hash);
            if (!isMatch) {
                return NextResponse.json(
                    { success: false, message: 'Current password is incorrect' },
                    { status: 401 }
                );
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            updates.password_hash = await bcrypt.hash(newPassword, salt);
        }

        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id);

            if (updateError) throw updateError;
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error: any) {
        console.error('Update Profile Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to update profile', error: error.message },
            { status: 500 }
        );
    }
};

export const GET = requireAuth(getHandler, ['admin']);
export const PUT = requireAuth(putHandler, ['admin']);
