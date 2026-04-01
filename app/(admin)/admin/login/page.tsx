'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password
            });

            if (loginError) throw loginError;

            router.replace('/admin');
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials'
                ? 'Email yoki parol noto\'g\'ri'
                : err.message || 'Xatolik yuz berdi');
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F3F4F6',
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                textAlign: 'center'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <div style={{
                        width: '64px', height: '64px',
                        background: 'hsla(var(--color-primary), 0.1)', borderRadius: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'hsl(var(--color-primary-dark))'
                    }}>
                        <Lock size={32} />
                    </div>
                </div>

                <h1 style={{
                    fontSize: '26px', fontWeight: 800,
                    color: '#111827', marginBottom: '8px'
                }}>
                    Admin Panel
                </h1>
                <p style={{
                    color: '#6B7280', fontSize: '15px',
                    marginBottom: '32px'
                }}>
                    Tizimga kirish uchun ma'lumotlaringizni kiriting
                </p>

                {error && (
                    <div style={{
                        background: '#FEF2F2', color: '#991B1B',
                        padding: '12px', borderRadius: '12px', fontSize: '14px',
                        marginBottom: '20px', textAlign: 'left'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block', fontSize: '13px', fontWeight: 600,
                            color: '#374151', marginBottom: '6px'
                        }}>
                            Email
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{
                                position: 'absolute', left: '14px', top: '50%',
                                transform: 'translateY(-50%)', color: '#9CA3AF'
                            }} />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="admin@example.com"
                                style={{
                                    width: '100%', padding: '12px 14px 12px 40px',
                                    borderRadius: '12px', border: '1px solid #E5E7EB',
                                    fontSize: '15px', color: '#111827',
                                    outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.15s'
                                }}
                                onFocus={e => e.target.style.borderColor = 'hsl(var(--color-primary-dark))'}
                                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block', fontSize: '13px', fontWeight: 600,
                            color: '#374151', marginBottom: '6px'
                        }}>
                            Parol
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                                style={{
                                    width: '100%', padding: '12px 44px 12px 14px',
                                    borderRadius: '12px', border: '1px solid #E5E7EB',
                                    fontSize: '15px', color: '#111827',
                                    outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.15s'
                                }}
                                onFocus={e => e.target.style.borderColor = 'hsl(var(--color-primary-dark))'}
                                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                style={{
                                    position: 'absolute', right: '14px', top: '50%',
                                    transform: 'translateY(-50%)', background: 'none',
                                    border: 'none', cursor: 'pointer', color: '#9CA3AF',
                                    padding: 0, display: 'flex'
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            background: loading ? '#9CA3AF' : 'hsl(var(--color-primary-dark))',
                            color: 'white',
                            padding: '14px',
                            borderRadius: '14px',
                            fontWeight: 700,
                            fontSize: '15px',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background 0.2s',
                            marginBottom: '20px'
                        }}
                    >
                        {loading && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
                        {loading ? 'Kirilmoqda...' : 'Kirish'}
                    </button>
                </form>

                <div style={{ height: '1px', background: '#F3F4F6', margin: '4px 0 20px' }} />

                <button
                    onClick={() => router.push('/')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'hsl(var(--color-primary-dark))',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        margin: '0 auto'
                    }}
                >
                    Asosiy sahifaga qaytish
                </button>
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
