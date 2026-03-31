'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Copy, Check, Share2, Gift, Users, Sparkles } from 'lucide-react';
import styles from './page.module.css';
import { useLanguage } from '@/app/context/LanguageContext';

export default function ShareAppPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);
    const shareUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '');
    const shareText = t('thankYou');

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);

            if (navigator.share) {
                setTimeout(() => {
                    navigator.share({
                        title: 'TORTEL\'E',
                        text: shareText,
                        url: shareUrl,
                    }).catch(() => {});
                }, 300);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={24} />
                </button>
                <h1 className={styles.title}>{t('shareApp')}</h1>
            </header>

            {/* Share Link Card */}
            <div className={styles.shareCard}>
                <div className={styles.shareIcon}>
                    <Share2 size={32} />
                </div>
                <h2 className={styles.shareTitle}>{t('shareCardTitle')}</h2>
                <p className={styles.shareDesc}>{t('shareCardDesc')}</p>

                <div className={styles.linkBox}>
                    <span className={styles.link}>{shareUrl}</span>
                    <button className={styles.copyBtn} onClick={handleCopy}>
                        {copied ? <Check size={20} /> : <Copy size={20} />}
                        <span>{copied ? t('copied2') : t('copy')}</span>
                    </button>
                </div>

                <p className={styles.hint}>{t('shareHint')}</p>
            </div>

            {/* Coming Soon Features - Blurred */}
            <div className={styles.comingSoonSection}>
                <div className={styles.blurOverlay}>
                    <div className={styles.comingSoonBadge}>
                        <Sparkles size={20} />
                        <span>{t('comingSoon')}</span>
                    </div>
                </div>

                {/* Stats - Blurred */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <Users size={24} className={styles.statIcon} />
                        <div className={styles.statValue}>5</div>
                        <div className={styles.statLabel}>{t('friendsLabel')}</div>
                    </div>
                    <div className={styles.statCard}>
                        <Gift size={24} className={styles.statIcon} />
                        <div className={styles.statValue}>50,000</div>
                        <div className={styles.statLabel}>{t('bonusLabel')}</div>
                    </div>
                </div>

                {/* Benefits - Blurred */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>{t('whyShare')}</h3>
                    <div className={styles.benefits}>
                        <div className={styles.benefit}>
                            <div className={styles.benefitIcon}>💰</div>
                            <div className={styles.benefitText}>
                                <h4>{t('shareBenefit1Title')}</h4>
                                <p>{t('shareBenefit1Desc')}</p>
                            </div>
                        </div>
                        <div className={styles.benefit}>
                            <div className={styles.benefitIcon}>🎁</div>
                            <div className={styles.benefitText}>
                                <h4>{t('shareBenefit2Title')}</h4>
                                <p>{t('shareBenefit2Desc')}</p>
                            </div>
                        </div>
                        <div className={styles.benefit}>
                            <div className={styles.benefitIcon}>⭐</div>
                            <div className={styles.benefitText}>
                                <h4>{t('shareBenefit3Title')}</h4>
                                <p>{t('shareBenefit3Desc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
