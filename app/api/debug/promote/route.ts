import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// WARNING: This is a temporary debug route. Delete in production.
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ success: false, message: 'Provide email param' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('email', email)
            .select();

        if (error) throw error;

        return NextResponse.json({ success: true, user: data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
