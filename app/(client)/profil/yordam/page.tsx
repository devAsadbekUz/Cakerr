import { Phone, MessageCircle, Package, CreditCard, Truck, User } from 'lucide-react';
import { TELEGRAM_CONFIG } from '@/app/utils/telegramConfig';
import { getServerT } from '@/app/utils/getServerLang';
import BackButton from '@/app/components/shared/BackButton';
import FAQAccordion from './FAQAccordion';
import styles from './page.module.css';

export default async function HelpCenterPage() {
    const t = await getServerT();

    const faqData = t('faqData') as { question: string; answer: string }[];

    const topics = [
        { Icon: Package, label: t('topicOrders'), color: '#E91E63' },
        { Icon: CreditCard, label: t('payment'), color: '#F59E0B' },
        { Icon: Truck, label: t('delivery'), color: '#10B981' },
        { Icon: User, label: t('topicAccount'), color: '#6366F1' },
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <BackButton className={styles.backBtn} />
                <h1 className={styles.title}>{t('helpCenter')}</h1>
            </header>

            {/* Quick Contact */}
            <div className={styles.contactSection}>
                <h2 className={styles.sectionTitle}>{t('contactTitle')}</h2>
                <div className={styles.contactGrid}>
                    <a href="tel:+998901234567" className={styles.contactCard}>
                        <div className={`${styles.contactIcon} ${styles.phone}`}>
                            <Phone size={24} />
                        </div>
                        <div className={styles.contactInfo}>
                            <h3>{t('phone')}</h3>
                            <p>+998 90 123 45 67</p>
                        </div>
                    </a>
                    <a href={TELEGRAM_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                        <div className={`${styles.contactIcon} ${styles.telegram}`}>
                            <MessageCircle size={24} />
                        </div>
                        <div className={styles.contactInfo}>
                            <h3>Telegram</h3>
                            <p>@{TELEGRAM_CONFIG.botUsername}</p>
                        </div>
                    </a>
                </div>
            </div>

            {/* Topics */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{t('topics')}</h2>
                <div className={styles.topicsGrid}>
                    {topics.map(({ Icon, label, color }) => (
                        <div key={label} className={styles.topicCard}>
                            <div className={styles.topicIcon} style={{ backgroundColor: `${color}20`, color }}>
                                <Icon size={24} />
                            </div>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQ — accordion state lives in client island */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{t('faqTitle')}</h2>
                <FAQAccordion faqData={faqData} />
            </div>
        </div>
    );
}
