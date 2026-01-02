'use client';

import React, { useState, useRef } from 'react';
import { Camera, X, Check, Loader2, User as UserIcon } from 'lucide-react';
import styles from './EditProfileModal.module.css';
import { createClient } from '@/app/utils/supabase/client';
import { User } from '@supabase/supabase-js';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onUpdate: () => void;
}

export default function EditProfileModal({ isOpen, onClose, user, onUpdate }: EditProfileModalProps) {
    const supabase = createClient();
    const [fullName, setFullName] = useState(user.user_metadata?.full_name || '');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const avatarUrl = user.user_metadata?.avatar_url;

    if (!isOpen) return null;

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            });

            if (authError) throw authError;

            // Also update the profiles table
            const { error: dbError } = await supabase
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', user.id);

            if (dbError) throw dbError;

            onUpdate();
            onClose();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: authError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (authError) throw authError;

            const { error: dbError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (dbError) throw dbError;

            onUpdate();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setUploading(false);
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
                        disabled={loading || uploading}
                    >
                        {loading ? <Loader2 className={styles.spin} size={20} /> : <Check size={24} />}
                    </button>
                </div>

                <div className={styles.avatarSection}>
                    <div className={styles.avatarWrapper} onClick={handlePhotoClick}>
                        {uploading ? (
                            <div className={styles.uploaderOverlay}>
                                <Loader2 className={styles.spin} size={32} />
                            </div>
                        ) : avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className={styles.avatarImage} />
                        ) : (
                            <div className={styles.avatarPlaceholder}>
                                <UserIcon size={48} />
                            </div>
                        )}
                        <div className={styles.cameraIcon}>
                            <Camera size={16} />
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className={styles.hiddenInput}
                        onChange={handleFileChange}
                        accept="image/*"
                    />
                    <p className={styles.avatarHint}>Rasm ustiga bosing va o’zgartiring</p>
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
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
