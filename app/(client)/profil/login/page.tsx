'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mail, ArrowRight, User } from 'lucide-react';
import styles from './page.module.css';

import { createClient } from '@/app/utils/supabase/client';

export default function LoginPage() {
    const router = useRouter();
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
                    }
                }
            });

            if (error) throw error;

            router.push(`/profil/login/verify?email=${encodeURIComponent(email)}&name=${encodeURIComponent(fullName)}`);
        } catch (err: any) {
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={24} />
                </button>
                <h1 className={styles.title}>Kirish</h1>
                <p className={styles.subtitle}>Profilingizga kirish uchun ma'lumotlaringizni kiriting</p>
            </header>

            <form className={styles.form} onSubmit={handleLogin}>
                <div className={styles.inputWrapper}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Ismingiz"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        autoFocus
                    />
                    <User className={styles.icon} size={20} />
                </div>

                <div className={styles.inputWrapper} style={{ marginTop: '16px' }}>
                    <input
                        type="email"
                        className={styles.input}
                        placeholder="example@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Mail className={styles.icon} size={20} />
                </div>

                {error && <p className={styles.errorText}>{error}</p>}

                <p className={styles.note}>
                    Pochtangizga tasdiqlash kodi yuboriladi
                </p>

                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={!email.includes('@') || loading}
                >
                    {loading ? 'Yuborilmoqda...' : 'Davom etish'}
                    <ArrowRight size={20} />
                </button>
            </form>

            <footer className={styles.footer}>
                <p>Tizimga kirish orqali siz bizning <span>Foydalanish shartlarimizga</span> rozilik bildirasiz</p>
            </footer>
        </div>
    );
}
