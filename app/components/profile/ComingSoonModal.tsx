'use client';

import { X, Calendar, Sparkles, Bell, Cookie, Heart, Star, Gift } from 'lucide-react';
import styles from './ComingSoonModal.module.css';
import { useLanguage } from '@/app/context/LanguageContext';

interface ComingSoonModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
    featureType?: 'calendar' | 'preferences' | 'general';
}

export default function ComingSoonModal({
    isOpen,
    onClose,
    featureName = "",
    featureType = 'general'
}: ComingSoonModalProps) {
    const { t } = useLanguage();

    const FEATURE_CONFIGS = {
        calendar: {
            icon: Calendar,
            features: [
                { icon: Calendar, text: t('calendarFeature1') },
                { icon: Bell, text: t('calendarFeature2') }
            ]
        },
        preferences: {
            icon: Cookie,
            features: [
                { icon: Heart, text: t('prefFeature1') },
                { icon: Star, text: t('prefFeature2') },
                { icon: Gift, text: t('prefFeature3') }
            ]
        },
        general: {
            icon: Calendar,
            features: [
                { icon: Calendar, text: t('calendarFeature1') },
                { icon: Bell, text: t('calendarFeature2') }
            ]
        }
    };

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

                <h2 className={styles.title}>{t('comingSoonTitle')}</h2>
                <p className={styles.description}>
                    {featureName}{t('comingSoonDesc')}
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
                    {t('understood')}
                </button>
            </div>
        </div>
    );
}
