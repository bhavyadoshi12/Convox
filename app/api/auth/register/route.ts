import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import { ApiError, handleApiError } from '@/lib/apiError';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, role } = body;

        // validation
        if (!name || !email || !password) {
            throw ApiError.BadRequest('Please provide name, email and password');
        }

        if (password.length < 6) {
            throw ApiError.BadRequest('Password must be at least 6 characters');
        }

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return NextResponse.json(
                { success: false, message: 'User already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                name,
                email: email.toLowerCase(),
                password_hash: passwordHash,
                role: role || 'student',
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
            })
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        // Generate token
        const token = generateToken(user.id, user.email, user.role);

        return NextResponse.json(
            {
                success: true,
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        return handleApiError(error);
    }
}
