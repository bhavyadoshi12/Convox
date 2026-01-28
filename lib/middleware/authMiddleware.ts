import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, UserPayload } from '@/lib/auth';

type HandlerFunction = (
    req: NextRequest,
    user: UserPayload,
    context: any
) => Promise<NextResponse>;

export const requireAuth = (
    handler: HandlerFunction,
    allowedRoles: string[] = []
) => {
    return async (req: NextRequest, context: any) => {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader) {
                return NextResponse.json({ success: false, message: 'No token' }, { status: 401 });
            }

            const token = authHeader.split(' ')[1];
            if (!token) {
                return NextResponse.json({ success: false, message: 'Invalid token format' }, { status: 401 });
            }

            const user = verifyToken(token);

            if (!user) {
                return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
            }

            if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
                console.error(`[AuthMiddleware] 403 Forbidden. User Role: '${user.role}', Allowed: ${JSON.stringify(allowedRoles)}`);
                return NextResponse.json({ success: false, message: `Unauthorized role: ${user.role}` }, { status: 403 });
            }

            console.log(`[AuthMiddleware] Success. User: ${user.email} (${user.role})`);
            return handler(req, user, context);
        } catch (error: any) {
            console.error('Auth Middleware Error:', error);
            return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
        }
    };
};
