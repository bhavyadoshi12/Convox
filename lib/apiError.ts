import { NextResponse } from 'next/server';

/**
 * Custom Error class for API specific errors
 */
export class ApiError extends Error {
    statusCode: number;
    errors?: any[];

    constructor(statusCode: number, message: string, errors?: any[]) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.name = 'ApiError';

        // Ensure the prototype is set correctly for instanceof checks
        Object.setPrototypeOf(this, ApiError.prototype);
    }

    static BadRequest(message: string = 'Bad Request', errors?: any[]) {
        return new ApiError(400, message, errors);
    }

    static Unauthorized(message: string = 'Unauthorized') {
        return new ApiError(401, message);
    }

    static Forbidden(message: string = 'Forbidden') {
        return new ApiError(403, message);
    }

    static NotFound(message: string = 'Resource not found') {
        return new ApiError(404, message);
    }

    static Internal(message: string = 'Internal Server Error') {
        return new ApiError(500, message);
    }
}

/**
 * Standardized function to handle and format API errors
 */
export const handleApiError = (error: any) => {
    // Log the error for debugging (could be extended to use Winston/Axiom/Sentry)
    console.error('[API Error Log]:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });

    if (error instanceof ApiError) {
        return NextResponse.json(
            {
                success: false,
                message: error.message,
                errors: error.errors || [],
            },
            { status: error.statusCode }
        );
    }

    // Handle Mongoose Validation Error
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        return NextResponse.json(
            {
                success: false,
                message: 'Validation failed',
                errors: messages,
            },
            { status: 400 }
        );
    }

    // Default response for unhandled errors
    return NextResponse.json(
        {
            success: false,
            message: process.env.NODE_ENV === 'development'
                ? error.message
                : 'Something went wrong on our end. Please try again later.',
        },
        { status: 500 }
    );
};
