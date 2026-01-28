'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

export function withAuth<P extends object>(
    Component: React.ComponentType<P>,
    allowedRoles?: ('admin' | 'student')[]
) {
    return function ProtectedRoute(props: P) {
        const { user, loading, isAuthenticated } = useAuth();
        const router = useRouter();

        useEffect(() => {
            if (!loading) {
                if (!isAuthenticated) {
                    router.push('/login');
                } else if (allowedRoles && !allowedRoles.includes(user?.role as any)) {
                    // Redirect based on role if they try to access a page they aren't allowed to
                    if (user?.role === 'admin') {
                        router.push('/dashboard');
                    } else {
                        router.push('/student');
                    }
                }
            }
        }, [loading, isAuthenticated, user, router]);

        if (loading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-white">
                    <Spinner size="lg" variant="dots" color="#2D8CFF" />
                </div>
            );
        }

        if (!isAuthenticated) return null;

        if (allowedRoles && !allowedRoles.includes(user?.role as any)) return null;

        return <Component {...props} />;
    };
}
