'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Mail, ArrowRight, User } from 'lucide-react';
import styles from './page.module.css';

import { createClient } from '@/app/utils/supabase/client';

import { Suspense } from 'react';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo') || '';
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: true,
                    data: {
                        full_name: fullName
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            });

            if (error) throw error;

            router.push(`/profil/login/verify?email=${encodeURIComponent(email)}&name=${encodeURIComponent(fullName)}&redirectTo=${encodeURIComponent(redirectTo)}`);
        } catch (err: any) {
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo || '/profil')}`
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Xatolik yuz berdi');
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.heroSection}>
                <div className={styles.heroImageWrapper}>
                    <img
                        src="/auth-hero.png"
                        alt="Cakerr"
                        className={styles.heroImage}
                    />
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
                    <button className={styles.googleBtn} onClick={handleGoogleLogin} disabled={loading}>
                        <img src="https://www.google.com/favicon.ico" alt="Google" width={20} height={20} />
                        Google bilan kirish
                    </button>

                    <div className={styles.divider}>
                        <span>yoki email orqali</span>
                    </div>

                    <form className={styles.form} onSubmit={handleLogin}>
                        {error && <div className={styles.errorBanner}>{error}</div>}

                        <div className={styles.inputGroup}>
                            <div className={styles.inputWrapper}>
                                <User size={20} className={styles.inputIcon} />
                                <input
                                    type="text"
                                    placeholder="Ismingiz"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <div className={styles.inputWrapper}>
                                <Mail size={20} className={styles.inputIcon} />
                                <input
                                    type="email"
                                    placeholder="Email manzilingiz"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={!email.includes('@') || loading}
                        >
                            {loading ? 'Yuborilmoqda...' : 'Kodni olish'}
                            <ArrowRight size={20} />
                        </button>
                    </form>
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
