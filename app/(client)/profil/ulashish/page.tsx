'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Copy, Check, Share2, Gift, Users, Sparkles } from 'lucide-react';
import styles from './page.module.css';

export default function ShareAppPage() {
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const shareUrl = 'https://torte-le.uz';
    const shareText = 'TORTEL\'E ilovasidan eng mazali tortlarni buyurtma qiling! 🍰';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);

            // Trigger native share after copy
            if (navigator.share) {
                setTimeout(() => {
                    navigator.share({
                        title: 'Cakerr - Tortlar',
                        text: shareText,
                        url: shareUrl,
                    }).catch(() => {
                        // User cancelled share
                    });
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
                <h1 className={styles.title}>Ilovani ulashish</h1>
            </header>

            {/* Share Link Card */}
            <div className={styles.shareCard}>
                <div className={styles.shareIcon}>
                    <Share2 size={32} />
                </div>
                <h2 className={styles.shareTitle}>Cakerr ilovasini ulashing</h2>
                <p className={styles.shareDesc}>
                    Do'stlaringiz bilan ulashing va ular ham mazali tortlardan bahramand bo'lishsin!
                </p>

                <div className={styles.linkBox}>
                    <span className={styles.link}>{shareUrl}</span>
                    <button className={styles.copyBtn} onClick={handleCopy}>
                        {copied ? <Check size={20} /> : <Copy size={20} />}
                        <span>{copied ? 'Nusxalandi' : 'Nusxalash'}</span>
                    </button>
                </div>

                <p className={styles.hint}>
                    Nusxalash tugmasini bosing va ilovani tanlang 📱
                </p>
            </div>

            {/* Coming Soon Features - Blurred */}
            <div className={styles.comingSoonSection}>
                <div className={styles.blurOverlay}>
                    <div className={styles.comingSoonBadge}>
                        <Sparkles size={20} />
                        <span>Tez kunda</span>
                    </div>
                </div>

                {/* Stats - Blurred */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <Users size={24} className={styles.statIcon} />
                        <div className={styles.statValue}>5</div>
                        <div className={styles.statLabel}>Do'stlar</div>
                    </div>
                    <div className={styles.statCard}>
                        <Gift size={24} className={styles.statIcon} />
                        <div className={styles.statValue}>50,000</div>
                        <div className={styles.statLabel}>Bonus so'm</div>
                    </div>
                </div>

                {/* Benefits - Blurred */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Nima uchun ulashish kerak?</h3>
                    <div className={styles.benefits}>
                        <div className={styles.benefit}>
                            <div className={styles.benefitIcon}>💰</div>
                            <div className={styles.benefitText}>
                                <h4>Bonus pul ishlang</h4>
                                <p>Har bir do'stingiz uchun 10,000 so'm oling</p>
                            </div>
                        </div>
                        <div className={styles.benefit}>
                            <div className={styles.benefitIcon}>🎁</div>
                            <div className={styles.benefitText}>
                                <h4>Do'stlaringizga sovg'a</h4>
                                <p>Ular birinchi buyurtmada 15% chegirma oladi</p>
                            </div>
                        </div>
                        <div className={styles.benefit}>
                            <div className={styles.benefitIcon}>⭐</div>
                            <div className={styles.benefitText}>
                                <h4>Maxsus imtiyozlar</h4>
                                <p>Ko'proq ulashing, ko'proq bonuslar oling</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
