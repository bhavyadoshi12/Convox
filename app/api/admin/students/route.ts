import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';

const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const { data: students, error } = await supabase
            .from('users')
            .select('id, name, email, role, created_at')
            .eq('role', 'student')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            students
        });
    } catch (error: any) {
        console.error('Fetch Students Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch students', error: error.message },
            { status: 500 }
        );
    }
};

export const GET = requireAuth(handler, ['admin']);
