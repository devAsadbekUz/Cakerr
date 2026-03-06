'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Send, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { useTelegram } from '@/app/context/TelegramContext';
import { storeSession } from '@/app/utils/telegram';
import styles from './page.module.css';

type LoginStep = 'phone' | 'otp' | 'telegram';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo') || '/profil';
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<LoginStep>('phone');
    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [countdown, setCountdown] = useState(0);
    const { login, isTelegram } = useTelegram();

    // Set initial step based on environment
    useEffect(() => {
        if (isTelegram) {
            setStep('telegram');
        }
    }, [isTelegram]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Handle Telegram Mini App login (existing flow)
    const handleTelegramLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            await login();
            router.push(redirectTo);
        } catch (err: any) {
            console.error('[Login] Error:', err);
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    // Handle phone number submission - request OTP
    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone || phone.length < 9) {
            setError('Telefon raqamini kiriting');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Normalize phone to +998 format
            let normalizedPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
            if (normalizedPhone.startsWith('998')) {
                normalizedPhone = '+' + normalizedPhone;
            } else if (!normalizedPhone.startsWith('+998')) {
                normalizedPhone = '+998' + normalizedPhone.replace(/^0+/, '');
            }

            const response = await fetch('/api/auth/telegram/request-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: normalizedPhone })
            });

            const data = await response.json();

            if (data.error === 'not_linked') {
                setError('Bu raqam Telegram botga ulanmagan. Avval @moida_zakaz_bot ni oching va telefon raqamingizni ulashing.');
                return;
            }

            if (data.error) {
                setError(data.message || data.error);
                return;
            }

            // Success - move to OTP step
            setPhone(normalizedPhone);
            setStep('otp');
            setCountdown(60); // 60 second countdown for resend

        } catch (err: any) {
            console.error('[Login] Request OTP error:', err);
            setError('Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP verification
    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otpCode || otpCode.length !== 6) {
            setError('6 xonali kodni kiriting');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/telegram/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code: otpCode })
            });

            const data = await response.json();

            if (data.error) {
                // Show debug info for troubleshooting
                const debugInfo = data.debug ? ` [DEBUG: ${data.debug}]` : '';
                setError(`${data.message || 'Noto\'g\'ri kod'}${debugInfo}`);
                return;
            }

            // Success - store session and redirect
            storeSession({
                token: data.token,
                user: data.user,
                expiresAt: data.expiresAt
            });

            // Force page reload to update auth state
            window.location.href = redirectTo;

        } catch (err: any) {
            console.error('[Login] Verify OTP error:', err);
            setError('Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
        } finally {
            setLoading(false);
        }
    };

    // Render Telegram Mini App login (inside Telegram)
    if (step === 'telegram') {
        return (
            <div className={styles.container}>
                <div className={styles.heroSection}>
                    <div className={styles.heroImageWrapper}>
                        <Image src="/auth-hero.png" alt="Cakerr" fill className={styles.heroImage} priority style={{ objectFit: 'cover' }} />
                        <div className={styles.heroOverlay}></div>
                    </div>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <ChevronLeft size={28} />
                    </button>
                </div>

                <div className={styles.contentCard}>
                    <div className={styles.titleSection}>
                        <h1 className={styles.title}>Xush kelibsiz</h1>
                        <p className={styles.subtitle}>Eng shirin lahzalar shu yerdan boshlanadi ✨</p>
                    </div>

                    <div className={styles.authOptions}>
                        {error && <div className={styles.errorBanner}>{error}</div>}

                        <button
                            className={styles.telegramBtn}
                            onClick={handleTelegramLogin}
                            disabled={loading}
                        >
                            <Send size={20} />
                            {loading ? 'Kutilmoqda...' : 'Telegram bilan kirish'}
                        </button>

                        <p className={styles.hint}>
                            Tugmani bosing va telefon raqamingizni ulashing
                        </p>
                    </div>

                    <footer className={styles.footer}>
                        <p>Kirish orqali siz bizning <span>Foydalanish shartlarimizga</span> rozilik bildirasiz</p>
                    </footer>
                </div>
            </div>
        );
    }

    // Render Phone + OTP flow (browser)
    return (
        <div className={styles.container}>
            <div className={styles.heroSection}>
                <div className={styles.heroImageWrapper}>
                    <Image src="/auth-hero.png" alt="Cakerr" fill className={styles.heroImage} priority style={{ objectFit: 'cover' }} />
                    <div className={styles.heroOverlay}></div>
                </div>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={28} />
                </button>
            </div>

            <div className={styles.contentCard}>
                <div className={styles.titleSection}>
                    <h1 className={styles.title}>
                        {step === 'phone' ? 'Xush kelibsiz' : 'Kodni kiriting'}
                    </h1>
                    <p className={styles.subtitle}>
                        {step === 'phone'
                            ? 'Telefon raqamingiz orqali kiring'
                            : `Kod ${phone} raqamiga Telegram orqali yuborildi`
                        }
                    </p>
                </div>

                <div className={styles.authOptions}>
                    {error && <div className={styles.errorBanner}>{error}</div>}

                    {step === 'phone' ? (
                        <form onSubmit={handleRequestOTP} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <div className={styles.inputWrapper}>
                                    <Phone size={20} className={styles.inputIcon} />
                                    <input
                                        type="tel"
                                        className={styles.input}
                                        placeholder="+998 90 123 45 67"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={loading || !phone}
                            >
                                {loading ? (
                                    <Loader2 size={20} className={styles.spinner} />
                                ) : (
                                    <>
                                        Kod olish
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="123456"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        disabled={loading}
                                        maxLength={6}
                                        style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '24px' }}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={loading || otpCode.length !== 6}
                            >
                                {loading ? (
                                    <Loader2 size={20} className={styles.spinner} />
                                ) : (
                                    'Tasdiqlash'
                                )}
                            </button>

                            <div className={styles.resendRow}>
                                {countdown > 0 ? (
                                    <p className={styles.hint}>Qayta yuborish: {countdown}s</p>
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.resendBtn}
                                        onClick={() => {
                                            setStep('phone');
                                            setOtpCode('');
                                            setError(null);
                                        }}
                                    >
                                        Qayta yuborish
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    <p className={styles.hint}>
                        {step === 'phone' ? (
                            <>
                                📱 Avval <a href="https://t.me/moida_zakaz_bot" target="_blank" rel="noopener noreferrer" style={{ color: '#0088cc' }}>@moida_zakaz_bot</a> da raqamingizni ulang
                            </>
                        ) : (
                            'Telegram ilovasini oching va kodni kiriting'
                        )}
                    </p>
                </div>

                <footer className={styles.footer}>
                    <p>Kirish orqali siz bizning <span>Foydalanish shartlarimizga</span> rozilik bildirasiz</p>
                </footer>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Yuklanmoqda...</div>}>
            <LoginContent />
        </Suspense>
    );
}
