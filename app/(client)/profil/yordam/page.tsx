'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, Phone, MessageCircle, Package, CreditCard, Truck, User } from 'lucide-react';
import styles from './page.module.css';

interface FAQItem {
    question: string;
    answer: string;
}

const FAQ_DATA: FAQItem[] = [
    {
        question: "Buyurtmani qanday bekor qilsam bo'ladi?",
        answer: "Buyurtmani tayyorlanish boshlangunga qadar bekor qilishingiz mumkin. Profil bo'limidagi 'Buyurtmalar tarixi'ga o'ting va tegishli buyurtmani toping."
    },
    {
        question: "Yetkazib berish qancha vaqt oladi?",
        answer: "Yetkazib berish odatda 2-4 soat ichida amalga oshiriladi. Tanlangan vaqt oralig'ida tortingiz yetkazib beriladi."
    },
    {
        question: "To'lovni qanday amalga oshiraman?",
        answer: "Siz naqd pul yoki karta orqali to'lov qilishingiz mumkin. Kartadan to'lash uchun Payme yoki Click tizimlaridan foydalanishingiz mumkin."
    },
    {
        question: "Maxsus tort buyurtma qilsam bo'ladimi?",
        answer: "Albatta! 'Yaratish' bo'limida o'zingizga yoqqan dizaynda tort yaratishingiz mumkin. Shakl, o'lcham, ta'm va bezakni tanlang."
    },
    {
        question: "Tortni sovg'a sifatida yuborishim mumkinmi?",
        answer: "Ha, buyurtma berish paytida 'Sovg'a rejimi'ni tanlang. Qabul qiluvchining telefon raqamini kiriting va narx yashirin qoladi."
    }
];

export default function HelpCenterPage() {
    const router = useRouter();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const toggleFAQ = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const topics = [
        { icon: Package, label: 'Buyurtmalar', color: '#E91E63' },
        { icon: CreditCard, label: "To'lov", color: '#F59E0B' },
        { icon: Truck, label: 'Yetkazib berish', color: '#10B981' },
        { icon: User, label: 'Akkaunt', color: '#6366F1' }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ChevronLeft size={24} />
                </button>
                <h1 className={styles.title}>Yordam markazi</h1>
            </header>

            {/* Quick Contact */}
            <div className={styles.contactSection}>
                <h2 className={styles.sectionTitle}>Biz bilan bog'laning</h2>
                <div className={styles.contactGrid}>
                    <a href="tel:+998901234567" className={styles.contactCard}>
                        <div className={`${styles.contactIcon} ${styles.phone}`}>
                            <Phone size={24} />
                        </div>
                        <div className={styles.contactInfo}>
                            <h3>Telefon</h3>
                            <p>+998 90 123 45 67</p>
                        </div>
                    </a>
                    <a href="https://t.me/cakerr_support" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                        <div className={`${styles.contactIcon} ${styles.telegram}`}>
                            <MessageCircle size={24} />
                        </div>
                        <div className={styles.contactInfo}>
                            <h3>Telegram</h3>
                            <p>@cakerr_support</p>
                        </div>
                    </a>
                </div>
            </div>

            {/* Topics */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Mavzular</h2>
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
                <h2 className={styles.sectionTitle}>Ko'p beriladigan savollar</h2>
                <div className={styles.faqList}>
                    {FAQ_DATA.map((faq, index) => (
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
