const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVideos() {
    console.log('Fetching latest 5 videos...');
    const { data, error } = await supabase
        .from('videos')
        .select('id, title, source, video_url, drive_file_id, duration')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching videos:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkVideos();
