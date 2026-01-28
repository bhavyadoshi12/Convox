import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/authMiddleware';
import { UserPayload } from '@/lib/auth';

/**
 * Helper to parse duration string (e.g. "8:56", "1:05:30") to seconds.
 */
function parseDurationToSeconds(durationStr: string): number {
    const parts = durationStr.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2) {
        return (parts[0] * 60) + parts[1];
    } else if (parts.length === 3) {
        return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }
    return 0;
}

const handler = async (req: NextRequest, user: UserPayload) => {
    try {
        const { fileId } = await req.json();

        if (!fileId) {
            return NextResponse.json({ success: false, message: 'File ID is required' }, { status: 400 });
        }

        const fetchDuration = async (url: string) => {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                }
            });
            const html = await response.text();

            // Pattern 1: jsname based (user's finding + common variants)
            const jsnamePatterns = [
                /jsname="Mjm4te">([^<]+)<\/span>/,
                /jsname="[^"]+">(\d{1,2}:\d{2}(:\d{2})?)<\/span>/,
                /class="[^"]*duration[^"]*">([^<]+)<\/div>/i
            ];

            for (const pattern of jsnamePatterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    const seconds = parseDurationToSeconds(match[1].trim());
                    if (seconds > 0) return { seconds, method: 'html-span' };
                }
            }

            // Pattern 2: Metadata Arrays (Common in initial data blobs)
            const arrayTimePattern = /"(\d{1,2}:\d{2}(:\d{2})?)"/;
            const arrayMatch = html.match(arrayTimePattern);
            if (arrayMatch && arrayMatch[1]) {
                const seconds = parseDurationToSeconds(arrayMatch[1]);
                if (seconds > 0) return { seconds, method: 'js-array-string' };
            }

            // Pattern 3: Look for duration in milliseconds
            const durationMsPattern = /"durationMs":\s*["']?(\d+)["']?/;
            const msMatch = html.match(durationMsPattern);
            if (msMatch && msMatch[1]) {
                const seconds = Math.floor(parseInt(msMatch[1]) / 1000);
                if (seconds > 0) return { seconds, method: 'js-duration-ms' };
            }

            return null;
        };

        // Try /view first (default)
        let result = await fetchDuration(`https://drive.google.com/file/d/${fileId}/view`);

        // If failed, try /preview (embed) which has a simpler layout
        if (!result) {
            result = await fetchDuration(`https://drive.google.com/file/d/${fileId}/preview`);
        }

        if (result && result.seconds > 0) {
            return NextResponse.json({
                success: true,
                duration: result.seconds,
                method: result.method
            });
        }

        return NextResponse.json({
            success: false,
            message: 'Could not detect duration automatically. This file might be private or Google is blocking the request.'
        });

    } catch (error: any) {
        console.error('Duration Detection Error:', error);
        return NextResponse.json({ success: false, message: 'Server error during detection' }, { status: 500 });
    }
};

export const POST = requireAuth(handler, ['admin']);
