'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Search, Edit2, Trash2, Mail, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import UserModal from '@/components/admin/UserModal';

export default function AdminsPage() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const fetchAdmins = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setAdmins(data.admins);
            } else {
                throw new Error(data.message || 'Failed to fetch admins');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load admins');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Admin deleted successfully');
                fetchAdmins();
            } else {
                throw new Error(data.message || 'Failed to delete admin');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete admin');
        }
    };

    const filteredAdmins = admins.filter(admin =>
        admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Management</h1>
                    <p className="text-gray-500 mt-1">Add, edit or remove administrators from your platform.</p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => {
                        setSelectedUser(null);
                        setIsModalOpen(true);
                    }}
                    className="shadow-xl shadow-blue-100"
                >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Admin
                </Button>
            </div>

            {/* Stats/Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4">
                <div className="bg-blue-500 p-2 rounded-xl">
                    <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-blue-900">Platform Security</h3>
                    <p className="text-xs text-blue-700 mt-0.5">
                        Administrators have full access to manage videos, sessions, and other settings.
                        Ensure all added admins are trusted individuals.
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search admins by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-transparent text-sm focus:outline-none"
                    />
                </div>
            </div>

            {/* Admin Grid/List */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filteredAdmins.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAdmins.map((admin) => (
                        <div
                            key={admin.id}
                            className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 font-bold text-lg">
                                    {admin.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedUser(admin);
                                            setIsModalOpen(true);
                                        }}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(admin.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {admin.name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                    <Mail className="h-3 w-3" />
                                    {admin.email}
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase rounded-lg border border-green-100">
                                        Administrator
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        Joined {new Date(admin.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center text-center">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                        <Users className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No admins found</h3>
                    <p className="text-gray-500 max-w-xs mt-1">
                        Try adjusting your search or add a new administrator to get started.
                    </p>
                </div>
            )}

            {/* Modal */}
            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAdmins}
                user={selectedUser}
            />
        </div>
    );
}
