'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Lock, Mail, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import { validateEmail, validatePassword } from '@/lib/validation';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Validation
        if (!formData.name.trim()) {
            toast.error('Please enter your full name');
            return;
        }
        if (!formData.email) {
            toast.error('Please enter your email address');
            return;
        }
        if (!validateEmail(formData.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        const pwdValidation = validatePassword(formData.password);
        if (!pwdValidation.valid) {
            toast.error(pwdValidation.message || 'Password validation failed');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            // 2. POST to /api/auth/register
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // 3. Auto-login: Store token and user info via AuthContext
            login(data.token, data.user);

            toast.success('Account created successfully!');

            // 4. Redirect based on role
            if (data.user.role === 'admin') {
                router.push('/dashboard');
            } else {
                router.push('/student');
            }
        } catch (error: any) {
            toast.error(error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F9FA] px-4 py-12">
            <div className="max-w-[450px] w-full bg-white rounded-2xl shadow-xl p-8 border border-zinc-100">
                {/* Logo and Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-[#2D8CFF] rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-100">
                        <Video className="text-white w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#1F2937]">Create your account</h1>
                    <p className="text-zinc-500 mt-1">Join the ZoomStream community</p>
                </div>

                {/* Register Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Field */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5 ml-1">
                            Full Name
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-[#2D8CFF] transition-colors">
                                <User className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="block w-full pl-10 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CFF]/20 focus:border-[#2D8CFF] transition-all"
                                required
                            />
                        </div>
                    </div>

                    {/* Email Field */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5 ml-1">
                            Email Address
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-[#2D8CFF] transition-colors">
                                <Mail className="h-4 w-4" />
                            </div>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="name@company.com"
                                className="block w-full pl-10 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CFF]/20 focus:border-[#2D8CFF] transition-all"
                                required
                            />
                        </div>
                    </div>



                    {/* Password Field */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1.5 ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-[#2D8CFF] transition-colors">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="block w-full pl-10 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CFF]/20 focus:border-[#2D8CFF] transition-all"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1.5 ml-1">
                                Confirm
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-[#2D8CFF] transition-colors">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="block w-full pl-10 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CFF]/20 focus:border-[#2D8CFF] transition-all"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Show Password toggle */}
                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-xs font-semibold text-[#2D8CFF] flex items-center gap-1 hover:underline"
                        >
                            {showPassword ? (
                                <><EyeOff className="h-3 w-3" /> Hide Password</>
                            ) : (
                                <><Eye className="h-3 w-3" /> Show Password</>
                            )}
                        </button>
                    </div>

                    {/* Create Account Button */}
                    <div className="pt-2">
                        <Button
                            variant="primary"
                            className="w-full py-2.5 bg-[#2D8CFF] hover:bg-[#1a73e8] border-none shadow-md shadow-blue-100"
                            loading={isLoading}
                            type="submit"
                        >
                            Create Account
                        </Button>
                    </div>
                </form>

                {/* Footer Link */}
                <div className="mt-8 text-center text-sm text-zinc-600">
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold text-[#2D8CFF] hover:underline">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
