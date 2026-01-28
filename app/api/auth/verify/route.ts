import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { ApiError, handleApiError } from '@/lib/apiError';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        // 1. Get user payload from token in headers
        const payload = getAuthUser(request);

        if (!payload) {
            throw ApiError.Unauthorized('Invalid or expired token');
        }

        // 2. Fetch fresh user data from DB to ensure they still exist and check role
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', payload.id)
            .single();

        if (error || !user) {
            throw ApiError.NotFound('User not found');
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        });
    } catch (error: any) {
        return handleApiError(error);
    }
}
