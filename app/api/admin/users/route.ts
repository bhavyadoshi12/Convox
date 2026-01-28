import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: Fetch all admins
const getHandler = async (req: NextRequest, user: UserPayload) => {
    try {
        const { data: admins, error } = await supabase
            .from('users')
            .select('id, name, email, role, created_at')
            .eq('role', 'admin')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            admins
        });
    } catch (error: any) {
        console.error('Fetch Admins Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch admins', error: error.message },
            { status: 500 }
        );
    }
};

// POST: Create a new admin
const postHandler = async (req: NextRequest, user: UserPayload) => {
    try {
        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { success: false, message: 'Please provide all fields' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return NextResponse.json(
                { success: false, message: 'User with this email already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([
                {
                    name,
                    email: email.toLowerCase(),
                    password_hash,
                    role: 'admin'
                }
            ])
            .select('id, name, email, role')
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Admin created successfully',
            admin: newUser
        }, { status: 201 });

    } catch (error: any) {
        console.error('Create Admin Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to create admin', error: error.message },
            { status: 500 }
        );
    }
};

export const GET = requireAuth(getHandler, ['admin']);
export const POST = requireAuth(postHandler, ['admin']);
