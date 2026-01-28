/**
 * Form Validation Utilities
 */

/**
 * Validates an email address using a robust regex.
 */
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates a password based on security requirements.
 * - Minimum 6 characters
 * - At least one letter
 * - At least one number
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters long.' };
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
        return { valid: false, message: 'Password must contain at least one letter and one number.' };
    }

    return { valid: true };
};

/**
 * Validates a video file for format and size.
 * - Allowed formats: mp4, mov, avi
 * - Maximum size: 500MB
 */
export const validateVideoFile = (file: File): { valid: boolean; message?: string } => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo']; // mov is quicktime, avi is x-msvideo
    const maxSizeBytes = 500 * 1024 * 1024; // 500MB

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, message: 'Invalid file format. Please upload MP4, MOV, or AVI.' };
    }

    if (file.size > maxSizeBytes) {
        return { valid: false, message: 'File is too large. Maximum allowed size is 500MB.' };
    }

    return { valid: true };
};

/**
 * Validates that a session start time is in the future.
 */
export const validateSessionTime = (scheduledStart: string | Date): { valid: boolean; message?: string } => {
    const startTime = new Date(scheduledStart).getTime();
    const currentTime = new Date().getTime();

    if (isNaN(startTime)) {
        return { valid: false, message: 'Invalid date format.' };
    }

    if (startTime <= currentTime) {
        return { valid: false, message: 'Scheduled start time must be in the future.' };
    }

    return { valid: true };
};

/**
 * Validates that a message timestamp is within the video duration.
 */
export const validateTimestamp = (timestamp: number, videoDuration: number): { valid: boolean; message?: string } => {
    if (timestamp < 0) {
        return { valid: false, message: 'Timestamp cannot be negative.' };
    }

    if (timestamp > videoDuration) {
        return { valid: false, message: `Timestamp cannot exceed video duration (${videoDuration}s).` };
    }

    return { valid: true };
};
