'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, RefreshCcw } from 'lucide-react';
import styles from './page.module.css';

import { createClient } from '@/app/utils/supabase/client';

export default function VerifyPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';
    const name = searchParams.get('name') || '';
    const supabase = createClient();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timer, setTimer] = useState(60);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const countdown = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(countdown);
    }, []);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        setLoading(true);
        setError(null);
        const code = otp.join('');

        try {
            const { error } = await supabase.auth.verifyOtp({
                email: email,
                token: code,
                type: 'email',
            });

            if (error) throw error;

            router.push('/profil');
        } catch (err: any) {
            setError(err.message || 'Kod noto\'g\'ri');
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer === 0) {
            setTimer(60);
            await supabase.auth.signInWithOtp({ email: email });
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={24} />
                </button>
                <h1 className={styles.title}>{name ? `Salom, ${name}!` : 'Kodni kiriting'}</h1>
                <p className={styles.subtitle}>
                    Tasdiqlash kodi <b>{email}</b> pochtasiga yuborildi
                </p>
            </header>

            <div className={styles.otpGrid}>
                {otp.map((digit, index) => (
                    <input
                        key={index}
                        ref={(el) => { inputs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className={styles.otpInput}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        autoFocus={index === 0}
                    />
                ))}
            </div>

            {error && <p className={styles.errorText}>{error}</p>}

            <div className={styles.resendWrapper}>
                {timer > 0 ? (
                    <p className={styles.timer}>Kodni qayta yuborish: <span>0:{timer.toString().padStart(2, '0')}</span></p>
                ) : (
                    <button className={styles.resendBtn} onClick={handleResend}>
                        <RefreshCcw size={16} />
                        Kodni qayta yuborish
                    </button>
                )}
            </div>

            <button
                className={styles.verifyBtn}
                disabled={otp.some(d => !d) || loading}
                onClick={handleVerify}
            >
                {loading ? 'Tasdiqlanmoqda...' : 'Tasdiqlash'}
            </button>
        </div>
    );
}
