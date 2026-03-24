'use client';

import { X, Phone, Send, MessageCircle, Instagram } from 'lucide-react';
import styles from './ContactSheet.module.css';
import { useEffect, useState, useRef } from 'react';
import { TELEGRAM_CONFIG } from '@/app/utils/telegramConfig';

interface ContactSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ContactSheet({ isOpen, onClose }: ContactSheetProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            setDragY(0);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            const timer = setTimeout(() => setIsAnimating(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY.current;
        if (deltaY > 0) {
            setDragY(deltaY);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (dragY > 100) {
            onClose();
        } else {
            setDragY(0);
        }
    };

    if (!isOpen && !isAnimating) return null;

    return (
        <div className={`${styles.wrapper} ${isOpen ? styles.open : ''}`}>
            <div className={styles.backdrop} onClick={onClose} />
            <div
                className={`${styles.sheet} ${isDragging ? styles.dragging : ''}`}
                style={{ transform: isOpen ? `translateY(${dragY}px)` : 'translateY(100%)' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className={styles.grabber} />
                <div className={styles.header}>
                    <div className={styles.titleGroup}>
                        <h2 className={styles.title}>Biz bilan bog'laning</h2>
                        <p className={styles.subtitle}>
                            Savollaringiz bormi? Biz bilan quyidagi usullar orqali bog'laning
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <ContactItem
                        icon={<Phone size={24} />}
                        label="Telefon"
                        value="+998 88 956 57 00"
                        color="#4ADE80"
                        href="tel:+998889565700"
                    />
                    <ContactItem
                        icon={<Send size={24} />}
                        label="Telegram"
                        value={`@${TELEGRAM_CONFIG.botUsername}`}
                        color="#60A5FA"
                        href={TELEGRAM_CONFIG.botLink}
                    />
                    <ContactItem
                        icon={<Instagram size={24} />}
                        label="Instagram"
                        value="moida_cooking_house"
                        color="#E1306C"
                        href="https://www.instagram.com/moida_cooking_house/"
                    />
                </div>

                <div className={styles.footer}>
                    Ish vaqti: Har kuni 9:00 - 21:00
                </div>
            </div>
        </div>
    );
}

function ContactItem({ icon, label, value, color, href }: any) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={styles.contactItem}>
            <div className={styles.iconWrapper} style={{ backgroundColor: `${color}15`, color: color }}>
                {icon}
            </div>
            <div className={styles.contactInfo}>
                <span className={styles.label}>{label}</span>
                <span className={styles.value}>{value}</span>
            </div>
        </a>
    );
}
