'use client';

import React, { useEffect } from 'react';
import { Check, X, Phone, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import styles from './SuccessModal.module.css';
import { useLanguage } from '@/app/context/LanguageContext';
import { TELEGRAM_CONFIG } from '@/app/utils/telegramConfig';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SuccessModal({ isOpen, onClose }: SuccessModalProps) {
    const { t } = useLanguage();

    useEffect(() => {
        if (isOpen) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 3001 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            let lastFire = 0;
            let rafId: number;

            const frame = () => {
                const now = Date.now();
                const timeLeft = animationEnd - now;
                if (timeLeft <= 0) return;

                // Fire every ~250ms but driven by rAF so it syncs with screen refresh
                if (now - lastFire >= 250) {
                    lastFire = now;
                    const particleCount = 50 * (timeLeft / duration);
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
                }

                rafId = requestAnimationFrame(frame);
            };

            rafId = requestAnimationFrame(frame);

            const redirectTimer = setTimeout(() => {
                onClose();
            }, 8000);

            return () => {
                cancelAnimationFrame(rafId);
                clearTimeout(redirectTimer);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={18} color="#9CA3AF" />
                </button>

                <div className={styles.iconWrapper}>
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        border: '4px solid #E91E63',
                        borderRadius: '50%',
                        opacity: 0.2,
                        animation: 'pulse 2s infinite'
                    }} />
                    <Check className={styles.checkmark} />
                </div>

                <h2 className={styles.title}>{t('orderAccepted')}</h2>
                <p className={styles.message}>{t('orderAcceptedMsg')}</p>

                <div className={styles.contactSection}>
                    <p className={styles.contactNote}>{t('successContactNote')}</p>
                    <div className={styles.contactButtons}>
                        <a 
                            href="tel:+998901877879"
                            className={styles.contactBtn}
                            style={{ background: '#BE185D', color: 'white' }}
                        >
                            <Phone size={18} />
                            {t('contactPhone')}
                        </a>
                        <a 
                            href={TELEGRAM_CONFIG.supportLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.contactBtn}
                            style={{ background: '#FFFFFF', color: '#BE185D', border: '1.5px solid #FBCFE8' }}
                        >
                            <Send size={18} />
                            {t('contactTelegram')}
                        </a>
                    </div>
                </div>

                <button className={styles.okBtn} onClick={onClose}>
                    {t('understood') || 'OK'}
                </button>

                <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ animationDuration: '8s' }} />
                </div>

                <style jsx>{`
                    @keyframes pulse {
                        0% { transform: scale(1); opacity: 0.2; }
                        50% { transform: scale(1.2); opacity: 0; }
                        100% { transform: scale(1); opacity: 0.2; }
                    }
                `}</style>
            </div>
        </div>
    );
}
