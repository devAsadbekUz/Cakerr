'use client';

import React from 'react';
import { Trash2, X } from 'lucide-react';
import styles from './ConfirmDeleteModal.module.css';
import { useLanguage } from '@/app/context/LanguageContext';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
}

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, itemName }: ConfirmDeleteModalProps) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={20} />
                </button>

                <div className={styles.iconWrapper}>
                    <Trash2 size={32} color="#EF4444" />
                </div>

                <h2 className={styles.title}>{t('confirmRemoveTitle')}</h2>
                <p className={styles.message}>
                    &quot;{itemName}&quot; {t('confirmRemoveMessage')}
                </p>

                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        {t('cancel')}
                    </button>
                    <button className={styles.deleteBtn} onClick={() => {
                        onConfirm();
                        onClose();
                    }}>
                        {t('delete')}
                    </button>
                </div>
            </div>
        </div>
    );
}
