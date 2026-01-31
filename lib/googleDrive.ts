/**
 * Google Drive Utilities for Convox
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

    // Handle generic cases and valid ID characters (alphanumeric, -, _)
    const regexes = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/, // Standard /file/d/ID
        /id=([a-zA-Z0-9_-]+)/,         // ?id=ID
        /\/d\/([a-zA-Z0-9_-]+)/,       // Short /d/ID
        /^([a-zA-Z0-9_-]+)$/           // Direct ID input
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
 * Validates a Google Drive link.
 * We trust the ID extraction primarily. The fetch check is optional/best-effort
 * because CORS often blocks client-side checks for Drive links.
 */
export async function validateDriveLink(url: string): Promise<{ isValid: boolean; fileId: string | null; error?: string }> {
    const fileId = extractDriveFileId(url);

    if (!fileId) {
        return { isValid: false, fileId: null, error: "Invalid Google Drive URL" };
    }

    // We used to try fetching the thumbnail, but CORS issues often cause false negatives.
    // For now, if we extracted an ID, we assume it's a valid link format.
    // The VideoPlayer will handle playback errors if the file is private.
    return { isValid: true, fileId };
}
