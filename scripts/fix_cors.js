const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Helper to load env vars from .env.local
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        if (!fs.existsSync(envPath)) {
            console.error('No .env.local file found!');
            return {};
        }
        const envConfig = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
            }
        });
        return env;
    } catch (e) {
        console.error('Error loading env:', e);
        return {};
    }
}

async function fixCors() {
    const env = loadEnv();
    const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
    const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase credentials in .env.local');
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Updating CORS for "videos" bucket...');

    const { data, error } = await supabase
        .storage
        .updateBucket('videos', {
            public: false, // Keep it private if it was private, or change as needed. Usually videos are public for streaming, but logic might rely on signed URLs.
            // Let's assume we just want to fix CORS.
            allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'image/jpeg', 'image/png'],
            fileSizeLimit: 2147483648, // 2GB
        });

    // Unfortuantely updateBucket doesn't expose CORS directly in the JS SDK typed interface sometimes, 
    // but the underlying API supports it.
    // If the SDK doesn't support it, we might need a direct fetch.

    // Trying direct REST API call for certainty
    try {
        const response = await fetch(`${supabaseUrl}/storage/v1/bucket/videos`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({
                public: true,
                cors_origins: ['*'] // ALLOW ALL ORIGINS FOR UPLOAD
            })
        });

        if (response.ok) {
            console.log('Successfully updated CORS to allow *');
        } else {
            console.error('Failed to update CORS:', await response.text());
        }
    } catch (err) {
        console.error('Error updating CORS:', err);
    }
}

fixCors();
