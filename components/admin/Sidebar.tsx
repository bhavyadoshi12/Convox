"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Video, Calendar, Settings, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming standard utils from shadcn or custom
import { useAuth } from '@/context/AuthContext';

const sidebarItems = [
    { icon: Home, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Video, label: 'Videos', href: '/admin/videos' },
    { icon: Calendar, label: 'Sessions', href: '/admin/sessions' },
    { icon: Users, label: 'Students', href: '/admin/students' },
    { icon: Users, label: 'Admins', href: '/admin/admins' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();

    return (
        <div className="flex h-full w-64 flex-col bg-[#1F2937] text-white transition-all duration-300 md:w-64">
            {/* Logo Area */}
            <div className="flex h-16 items-center justify-center border-b border-gray-700">
                <h1 className="text-xl font-bold tracking-wider text-white">
                    <span className="text-[#2D8CFF]">ZoomStream</span> Sync
                </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2 p-4">
                {sidebarItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-700/50 hover:text-[#2D8CFF]",
                                isActive ? "bg-gray-700 text-[#2D8CFF]" : "text-gray-400"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Logout */}
            <div className="border-t border-gray-700 p-4">
                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                >
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
            </div>
        </div>
    );
}
