'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Check if user is admin or student and redirect accordingly
        const role = localStorage.getItem('role');

        if (role === 'admin') {
            router.push('/admin/dashboard');
        } else if (role === 'student') {
            router.push('/student');
        } else {
            router.push('/login');
        }
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-xl">Redirecting...</div>
        </div>
    );
}
