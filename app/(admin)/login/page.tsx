'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Lock, ArrowRight, Phone, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.signInWithOtp({
                phone: phone.startsWith('+') ? phone : `+998${phone.replace(/\D/g, '')}`,
            });

            if (error) throw error;
            setStep('OTP');
        } catch (err: any) {
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const formattedPhone = phone.startsWith('+') ? phone : `+998${phone.replace(/\D/g, '')}`;
            const { data, error } = await supabase.auth.verifyOtp({
                phone: formattedPhone,
                token: otp,
                type: 'sms',
            });

            if (error) throw error;

            if (data.session) {
                // Optional: Check role here if you have a profiles table set up
                router.push('/admin');
            }
        } catch (err: any) {
            setError(err.message || 'Kod noto\'g\'ri');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F3F4F6'
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <div style={{
                        width: '56px', height: '56px',
                        background: '#FCE7F3', borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#BE185D'
                    }}>
                        <Lock size={28} />
                    </div>
                </div>

                <h1 style={{
                    fontSize: '24px', fontWeight: 800, textAlign: 'center',
                    color: '#111827', marginBottom: '8px'
                }}>
                    Admin Panel
                </h1>
                <p style={{
                    textAlign: 'center', color: '#6B7280', fontSize: '14px',
                    marginBottom: '32px'
                }}>
                    Tizimga kirish uchun telefon raqamingizni kiriting
                </p>

                {error && (
                    <div style={{
                        background: '#FEF2F2', color: '#991B1B',
                        padding: '12px', borderRadius: '8px', fontSize: '14px',
                        marginBottom: '20px', textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {step === 'PHONE' ? (
                    <form onSubmit={handleSendOtp}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                Telefon raqam
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={20} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                                <input
                                    type="tel"
                                    placeholder="+998 90 123 45 67"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    style={{
                                        width: '100%', padding: '12px 12px 12px 42px',
                                        borderRadius: '12px', border: '1px solid #E5E7EB',
                                        fontSize: '16px', outline: 'none', transition: 'all 0.2s'
                                    }}
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', background: '#BE185D', color: 'white',
                                padding: '14px', borderRadius: '14px', fontWeight: 600,
                                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : (
                                <>
                                    Kod yuborish <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                SMS Kod
                            </label>
                            <input
                                type="text"
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px', textAlign: 'center',
                                    borderRadius: '12px', border: '1px solid #E5E7EB',
                                    fontSize: '24px', letterSpacing: '8px', fontWeight: 700,
                                    outline: 'none'
                                }}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', background: '#BE185D', color: 'white',
                                padding: '14px', borderRadius: '14px', fontWeight: 600,
                                border: 'none', cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Tekshirilmoqda...' : 'Kirish'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('PHONE')}
                            style={{
                                width: '100%', background: 'transparent', color: '#6B7280',
                                padding: '12px', marginTop: '12px', border: 'none',
                                cursor: 'pointer', fontSize: '14px'
                            }}
                        >
                            Raqamni o'zgartirish
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
