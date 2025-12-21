'use client';

import React from 'react';
import { X, Calendar, Sparkles, Bell, Cookie, Heart, Star, Gift } from 'lucide-react';
import styles from './ComingSoonModal.module.css';

interface ComingSoonModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
    featureType?: 'calendar' | 'preferences' | 'general';
}

const FEATURE_CONFIGS = {
    calendar: {
        icon: Calendar,
        features: [
            { icon: Calendar, text: 'Muhim sanalarni saqlang' },
            { icon: Bell, text: 'Eslatmalar oling' }
        ]
    },
    preferences: {
        icon: Cookie,
        features: [
            { icon: Heart, text: "Sevimli ta'mlaringizni saqlang" },
            { icon: Star, text: 'Maxsus tavsiyalar oling' },
            { icon: Gift, text: 'Shaxsiy chegirmalar' }
        ]
    },
    general: {
        icon: Calendar,
        features: [
            { icon: Calendar, text: 'Muhim sanalarni saqlang' },
            { icon: Bell, text: 'Eslatmalar oling' }
        ]
    }
};

export default function ComingSoonModal({
    isOpen,
    onClose,
    featureName = "Bu funksiya",
    featureType = 'general'
}: ComingSoonModalProps) {
    if (!isOpen) return null;

    const config = FEATURE_CONFIGS[featureType];
    const IconComponent = config.icon;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={20} />
                </button>

                <div className={styles.iconWrapper}>
                    <div className={styles.iconCircle}>
                        <IconComponent size={48} strokeWidth={1.5} />
                    </div>
                    <div className={styles.sparkle1}>
                        <Sparkles size={20} />
                    </div>
                    <div className={styles.sparkle2}>
                        <Sparkles size={16} />
                    </div>
                </div>

                <h2 className={styles.title}>Tez kunda!</h2>
                <p className={styles.description}>
                    {featureName} ustida ishlamoqdamiz va uni tez orada ishga tushiramiz.
                </p>

                <div className={styles.features}>
                    {config.features.map((feature, index) => {
                        const FeatureIcon = feature.icon;
                        return (
                            <div key={index} className={styles.featureItem}>
                                <div className={styles.featureIcon}>
                                    <FeatureIcon size={20} />
                                </div>
                                <span>{feature.text}</span>
                            </div>
                        );
                    })}
                </div>

                <button className={styles.okBtn} onClick={onClose}>
                    Tushunarli
                </button>
            </div>
        </div>
    );
}
