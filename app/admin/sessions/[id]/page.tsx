"use client";

import React, { use } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const SessionForm = dynamic(() => import('@/components/admin/SessionForm'), {
    loading: () => (
        <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2D8CFF] border-t-transparent"></div>
        </div>
    )
});

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

const AdminLivePanel = dynamic(() => import('@/components/admin/AdminLivePanel'), {
    loading: () => <div className="h-full w-full animate-pulse bg-gray-100 rounded-2xl"></div>
});

export default function SessionDetailsPage({ params }: PageProps) {
    const { id } = use(params);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/sessions"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Session</h1>
                    <p className="text-gray-500">Edit details and moderate live chat</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <SessionForm sessionId={id} />
                </div>
                <div className="xl:col-span-1">
                    <AdminLivePanel sessionId={id} />
                </div>
            </div>
        </div>
    );
}
