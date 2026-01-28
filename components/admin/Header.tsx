"use client";

import { Bell, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Custom Header component
export default function AdminHeader() {
    const { user } = useAuth();

    return (
        <header className="flex h-16 w-full items-center justify-between border-b bg-white px-6 shadow-sm">
            {/* Left side (Breadcrumbs or Page Title - optional) */}
            <div className="flex items-center gap-4">
                {/* Placeholder for page title dynamic logic if needed */}
                <span className="text-gray-500">Welcome back, {user?.name || 'Admin'}</span>
            </div>

            {/* Right side (Profile & Actions) */}
            <div className="flex items-center gap-4">
                <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                </button>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end hidden md:flex">
                        <span className="text-sm font-semibold text-gray-700">{user?.name || 'Admin User'}</span>
                        <span className="text-xs text-gray-500 truncate max-w-[200px]">{user?.email || 'Loading...'}</span>
                    </div>

                    <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200 border-2 border-gray-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-400" />
                    </div>
                </div>
            </div>
        </header>
    );
}
