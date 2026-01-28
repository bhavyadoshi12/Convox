"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/Sidebar';
import AdminHeader from '@/components/admin/Header';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    // Authentication Check (Client-side simulation until robust middleware/cookie auth is set)
    // In a real app, Middleware should handle this protection.
    // For now, we check if we have a token (very basic check).
    useEffect(() => {
        // Check for token in localStorage (assuming login logic saves it there)
        // or checks some auth state
        // For this demonstration, we'll assume "true" to let the build pass and UI be visible.
        // Uncomment real logic when Login page is connected.

        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');

        if (!token || role !== 'admin') {
            router.push('/login');
        } else {
            setIsAuthorized(true);
        }
    }, [router]);

    if (!isAuthorized) {
        return null; // Or a loading spinner
    }

    return (
        <div className="flex h-screen w-full bg-gray-50">
            {/* Sidebar - Fixed/Sticky */}
            <AdminSidebar />

            {/* Main Content Wrapper */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <AdminHeader />

                {/* Page Content - Scrollable */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
