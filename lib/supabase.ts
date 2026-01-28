import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase Environment Variables');
}

// Client for public operations (respects RLS, acts as anon)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for server-side admin operations (bypasses RLS)
// Use this ONLY in secure API routes after verifying custom auth
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : supabase; // Fallback to anon (will fail for protected ops if key is missing)

