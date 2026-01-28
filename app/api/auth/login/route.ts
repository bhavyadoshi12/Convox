import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import { ApiError, handleApiError } from '@/lib/apiError';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Validation
        if (!email || !password) {
            throw ApiError.BadRequest('Please provide email and password');
        }

        // Find User
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user) {
            throw ApiError.Unauthorized('Invalid credentials');
        }

        // Check Password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            throw ApiError.Unauthorized('Invalid credentials');
        }

        // Generate Token
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
            { status: 200 }
        );
    } catch (error: any) {
        return handleApiError(error);
    }
}
