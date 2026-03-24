'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, User, Phone, Save, Loader2 } from 'lucide-react';
import styles from './page.module.css';
import { profileService } from '@/app/services/profileService';
import { useSupabase } from '@/app/context/SupabaseContext';

export default function SozlamalarPage() {
    const router = useRouter();
    const { user } = useSupabase();
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (user) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchProfile = async () => {
        setLoading(true);
        const profile = await profileService.getProfile(user!.id);
        if (profile) {
            setFullName(profile.full_name || '');
            setPhoneNumber(profile.phone_number || '');
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);

        const { data, error } = await profileService.updateProfile(user!.id, {
            full_name: fullName,
            phone_number: phoneNumber
        });

        if (!error) {
            setSuccess(true);
            if (data) {
                window.dispatchEvent(new CustomEvent('tg_user_updated', { detail: data }));
            }
            setTimeout(() => setSuccess(false), 3000);
        } else {
            alert('Xatolik: ' + error.message);
        }
        setSaving(false);
    };

    if (loading) return <div className={styles.loading}>Yuklanmoqda...</div>;

    if (!user) {
        return (
            <div className={styles.container}>
                <p>Ushbu sahifani ko'rish uchun tizimga kiring.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={24} />
                </button>
                <h1 className={styles.title}>Sozlamalar</h1>
                <div style={{ width: 24 }} /> {/* Spacer */}
            </header>

            <form className={styles.form} onSubmit={handleSave}>
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Shaxsiy ma'lumotlar</h3>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>To'liq ism</label>
                        <div className={styles.inputWrapper}>
                            <User className={styles.inputIcon} size={20} />
                            <input
                                type="text"
                                className={styles.input}
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Ismingizni kiriting"
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Telefon raqam</label>
                        <div className={styles.inputWrapper}>
                            <Phone className={styles.inputIcon} size={20} />
                            <input
                                type="tel"
                                className={styles.input}
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+998 90 123 45 67"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Akkount ma'lumotlari</h3>
                    <div className={styles.readOnlyInfo}>
                        <label className={styles.label}>Email</label>
                        <p className={styles.infoText}>{user.email || 'Biriktirilmagan'}</p>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button
                        type="submit"
                        className={`${styles.saveBtn} ${success ? styles.successBtn : ''}`}
                        disabled={saving}
                    >
                        {saving ? (
                            <Loader2 className={styles.spin} size={20} />
                        ) : success ? (
                            'Saqlandi!'
                        ) : (
                            <>
                                <Save size={20} />
                                <span>Saqlash</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
