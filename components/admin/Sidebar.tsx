"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Video, Calendar, Settings, LogOut, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div
            className={cn(
                "flex h-full flex-col bg-[#1E1B4B] text-white transition-all duration-300 relative",
                isCollapsed ? "w-20" : "w-64"
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 z-50 rounded-full border border-gray-600 bg-[#1E1B4B] p-1 text-white shadow-md hover:bg-gray-700 md:flex hidden"
            >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Logo Area */}
            <div className="flex h-16 items-center justify-center border-b border-gray-700 overflow-hidden">
                <h1 className={cn("text-xl font-bold tracking-wider text-white transition-all", isCollapsed && "scale-0 opacity-0 hidden")}>
                    <span className="text-primary">Convox</span>
                </h1>
                {isCollapsed && <span className="text-xl font-bold text-primary">C</span>}
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
                            title={isCollapsed ? item.label : undefined}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-700/50 hover:text-primary",
                                isActive ? "bg-gray-700 text-primary" : "text-gray-400",
                                isCollapsed && "justify-center px-2"
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Logout */}
            <div className="border-t border-gray-700 p-4">
                <button
                    onClick={logout}
                    title={isCollapsed ? "Logout" : undefined}
                    className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-500",
                        isCollapsed && "justify-center px-2"
                    )}
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>Logout</span>}
                </button>
            </div>
        </div>
    );
}
