import { Share2, Gift, Users, Sparkles } from 'lucide-react';
import { getServerT } from '@/app/utils/getServerLang';
import BackButton from '@/app/components/shared/BackButton';
import CopyShareButton from './CopyShareButton';
import styles from './page.module.css';

export default async function ShareAppPage() {
    const t = await getServerT();
    const shareUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <BackButton className={styles.backBtn} />
                <h1 className={styles.title}>{t('shareApp')}</h1>
            </header>

            {/* Share Link Card */}
            <div className={styles.shareCard}>
                <div className={styles.shareIcon}>
                    <Share2 size={32} />
                </div>
                <h2 className={styles.shareTitle}>{t('shareCardTitle')}</h2>
                <p className={styles.shareDesc}>{t('shareCardDesc')}</p>

                {/* Copy/share interaction lives in client island */}
                <CopyShareButton
                    shareUrl={shareUrl}
                    copyLabel={t('copy')}
                    copiedLabel={t('copied2')}
                    shareText={t('thankYou')}
                />

                <p className={styles.hint}>{t('shareHint')}</p>
            </div>

            {/* Coming Soon Features — purely decorative/static */}
            <div className={styles.comingSoonSection}>
                <div className={styles.blurOverlay}>
                    <div className={styles.comingSoonBadge}>
                        <Sparkles size={20} />
                        <span>{t('comingSoon')}</span>
                    </div>
                </div>

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
