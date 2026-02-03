'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Lock, ArrowRight, Mail, Key, Loader2 } from 'lucide-react';

const ADMIN_EMAIL = 'moida.buvayda@gmail.com';

export default function AdminLoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const supabase = createClient();


    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const { error: loginError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/admin`
                }
            });

            if (loginError) throw loginError;
        } catch (err: any) {
            setError(err.message || 'Xatolik yuz berdi');
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
                        background: '#FCE7F3', borderRadius: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#BE185D'
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
                    Tizimga kirish uchun Google akkauntingizdan foydalaning
                </p>

                {error && (
                    <div style={{
                        background: '#FEF2F2', color: '#991B1B',
                        padding: '12px', borderRadius: '12px', fontSize: '14px',
                        marginBottom: '20px'
                    }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                        width: '100%',
                        background: 'white',
                        color: '#374151',
                        padding: '14px',
                        borderRadius: '14px',
                        fontWeight: 600,
                        border: '1px solid #E5E7EB',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s',
                        marginBottom: '20px'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = '#F9FAFB';
                        e.currentTarget.style.borderColor = '#D1D5DB';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                    }}
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" width={20} height={20} />
                    {loading ? 'Yuklanmoqda...' : 'Google bilan kirish'}
                </button>

                <div style={{ height: '1px', background: '#F3F4F6', margin: '24px 0' }} />

                <button
                    onClick={() => router.push('/')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#BE185D',
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
        </div>
    );
}
