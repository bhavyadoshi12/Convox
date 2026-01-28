import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// PATCH: Update an admin user
const patchHandler = async (req: NextRequest, user: UserPayload, context: any) => {
    try {
        const { id } = await context.params;
        const { name, email, password } = await req.json();

        const updateData: any = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email.toLowerCase();

        if (password) {
            const { hashPassword } = await import('@/lib/auth');
            updateData.password_hash = await hashPassword(password);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, message: 'No data provided to update' },
                { status: 400 }
            );
        }

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .eq('role', 'admin') // Ensure we only update admin users
            .select('id, name, email, role')
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Admin updated successfully',
            admin: updatedUser
        });

    } catch (error: any) {
        console.error('Update Admin Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to update admin', error: error.message },
            { status: 500 }
        );
    }
};

// DELETE: Remove an admin user
const deleteHandler = async (req: NextRequest, user: UserPayload, context: any) => {
    try {
        const { id } = await context.params;

        // Prevent admin from deleting themselves
        if (id === user.id) {
            return NextResponse.json(
                { success: false, message: 'You cannot delete your own account' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id)
            .eq('role', 'admin'); // Ensure we only delete admin users

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Admin deleted successfully'
        });

    } catch (error: any) {
        console.error('Delete Admin Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to delete admin', error: error.message },
            { status: 500 }
        );
    }
};

export const PATCH = requireAuth(patchHandler, ['admin']);
export const DELETE = requireAuth(deleteHandler, ['admin']);
