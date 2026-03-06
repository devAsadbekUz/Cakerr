'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Check, Loader2, User as UserIcon } from 'lucide-react';
import styles from './EditProfileModal.module.css';
import { createClient } from '@/app/utils/supabase/client';

// Compatible with both Supabase User and our UnifiedUser type
interface ProfileUser {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: {
        full_name?: string;
        avatar_url?: string;
    };
}

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: ProfileUser;
    onUpdate: () => void;
}

export default function EditProfileModal({ isOpen, onClose, user, onUpdate }: EditProfileModalProps) {
    const supabase = createClient();
    const [fullName, setFullName] = useState(user.user_metadata?.full_name || '');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const avatarUrl = user.user_metadata?.avatar_url;

    useEffect(() => {
        if (isOpen) {
            setFullName(user.user_metadata?.full_name || '');
        }
    }, [isOpen, user.user_metadata?.full_name]);

    useEffect(() => {
        async function fetchProfile() {
            if (!isOpen) return; // Only fetch if modal is open
            setFetching(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();

            if (data && !error) {
                setFullName(data.full_name);
            }
            setFetching(false);
        }
        fetchProfile();
    }, [user.id, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!fullName.trim()) return;
        setLoading(true);
        try {
            const { getAuthHeader } = await import('@/app/utils/telegram');
            const response = await fetch('/api/user/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify({ full_name: fullName })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            console.log('[EditProfile] Profile updated successfully:', data.user?.full_name);

            // Sync the updated user data across the app (SupabaseContext listens for this)
            if (data.success && data.user) {
                console.log('[EditProfile] Dispatching tg_user_updated event');
                window.dispatchEvent(new CustomEvent('tg_user_updated', { detail: data.user }));
            }

            onUpdate();
            onClose();
        } catch (error: any) {
            console.error('[EditProfile] Save fail:', error);
            alert(error.message || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                    <h2 className={styles.title}>Profilni tahrirlash</h2>
                    <button
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={loading || fetching}
                    >
                        {loading ? <Loader2 className={styles.spin} size={20} /> : <Check size={24} />}
                    </button>
                </div>

                <div className={styles.avatarSectionSimple}>
                    <div className={styles.avatarWrapperSimple}>
                        {avatarUrl ? (
                            <Image src={avatarUrl} alt="Avatar" fill className={styles.avatarImage} style={{ objectFit: 'cover' }} />
                        ) : (
                            <div className={styles.avatarPlaceholder}>
                                <UserIcon size={48} />
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>To'liq ismingiz</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Masalan: Aziz Toshpulatov"
                            autoFocus
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
