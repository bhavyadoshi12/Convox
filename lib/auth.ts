import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface UserPayload {
    id: string;
    role: 'admin' | 'student';
    email?: string;
}

// Generate JWT Token
export const generateToken = (userId: string, email: string, role: 'admin' | 'student'): string => {
    return jwt.sign({ id: userId, email, role }, JWT_SECRET, {
        expiresIn: '7d',
    });
};

// Verify JWT Token
export const verifyToken = (token: string): UserPayload | null => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
        return decoded;
    } catch (error) {
        return null;
    }
};

// Hash Password
export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
};

// Compare Password
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
};

// Get authenticated user from request header
export const getAuthUser = (request: NextRequest): UserPayload | null => {
    try {
        const token = request.headers.get('authorization')?.split(' ')[1];
        if (!token) return null;
        return verifyToken(token);
    } catch (error) {
        return null;
    }
};
