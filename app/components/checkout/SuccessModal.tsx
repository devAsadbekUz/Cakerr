'use client';

import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import styles from './SuccessModal.module.css';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SuccessModal({ isOpen, onClose }: SuccessModalProps) {
    useEffect(() => {
        if (isOpen) {
            // Trigger confetti
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 3001 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            // Auto-redirect after 3 seconds
            const redirectTimer = setTimeout(() => {
                onClose();
            }, 3000);

            return () => {
                clearInterval(interval);
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

                <h2 className={styles.title}>Buyurtma qabul qilindi! 🎉</h2>
                <p className={styles.message}>
                    Buyurtmangiz uchun rahmat, tez orada jamoamiz sizga bog'lanadi
                </p>

                <div className={styles.progressBar}>
                    <div className={styles.progressFill} />
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
