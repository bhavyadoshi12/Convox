/**
 * Google Drive Utilities for ZoomStream Sync
 */

/**
 * Extracts the file ID from various Google Drive URL formats.
 * Handles:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://docs.google.com/file/d/FILE_ID/edit
 * - Shortened links if they redirect to the above
 */
export function extractDriveFileId(url: string): string | null {
    if (!url) return null;

    const regexes = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/d\/([a-zA-Z0-9_-]+)/
    ];

    for (const regex of regexes) {
        const match = url.match(regex);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Returns a direct download URL for a Google Drive file.
 */
export function generateDirectLink(fileId: string): string {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Returns an iframe embed URL for a Google Drive video.
 */
export function generateEmbedLink(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Returns a thumbnail URL for a Google Drive file.
 */
export function generateThumbnailLink(fileId: string): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w640-h360`;
}

/**
 * Validates a Google Drive link and checks if it's publicly accessible.
 * Note: This is a basic check. Real validation might require a server-side HEAD request.
 */
export async function validateDriveLink(url: string): Promise<{ isValid: boolean; fileId: string | null; error?: string }> {
    const fileId = extractDriveFileId(url);

    if (!fileId) {
        return { isValid: false, fileId: null, error: "Invalid Google Drive URL" };
    }

    try {
        // We attempt to fetch the thumbnail as a way to check accessibility without needing API keys
        const thumbUrl = generateThumbnailLink(fileId);
        const response = await fetch(thumbUrl, { mode: 'no-cors' }); // no-cors for client-side check

        // Note: fetch with no-cors doesn't give us status code, but we can't do much more client-side
        // without a proxy or backend. For now, we trust the ID extraction and regex.

        return { isValid: true, fileId };
    } catch (error) {
        return { isValid: false, fileId, error: "Link might not be public" };
    }
}
