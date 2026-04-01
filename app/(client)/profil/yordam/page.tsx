'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, Phone, MessageCircle, Package, CreditCard, Truck, User } from 'lucide-react';
import { TELEGRAM_CONFIG } from '@/app/utils/telegramConfig';
import styles from './page.module.css';
import { useLanguage } from '@/app/context/LanguageContext';

export default function HelpCenterPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const toggleFAQ = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const faqData = t('faqData') as unknown as { question: string; answer: string }[];

    const topics = [
        { icon: Package, label: t('topicOrders'), color: '#E91E63' },
        { icon: CreditCard, label: t('payment'), color: '#F59E0B' },
        { icon: Truck, label: t('delivery'), color: '#10B981' },
        { icon: User, label: t('topicAccount'), color: '#6366F1' }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={24} />
                </button>
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
                    {topics.map((topic, index) => {
                        const Icon = topic.icon;
                        return (
                            <div key={index} className={styles.topicCard}>
                                <div className={styles.topicIcon} style={{ backgroundColor: `${topic.color}20`, color: topic.color }}>
                                    <Icon size={24} />
                                </div>
                                <span>{topic.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* FAQ */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{t('faqTitle')}</h2>
                <div className={styles.faqList}>
                    {faqData.map((faq, index) => (
                        <div key={index} className={styles.faqItem}>
                            <button
                                className={styles.faqQuestion}
                                onClick={() => toggleFAQ(index)}
                            >
                                <span>{faq.question}</span>
                                <ChevronDown
                                    size={20}
                                    className={`${styles.chevron} ${expandedIndex === index ? styles.chevronExpanded : ''}`}
                                />
                            </button>
                            <div className={`${styles.faqAnswer} ${expandedIndex === index ? styles.faqAnswerExpanded : ''}`}>
                                <p>{faq.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
