'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './page.module.css';

interface FAQItem {
    question: string;
    answer: string;
}

export default function FAQAccordion({ faqData }: { faqData: FAQItem[] }) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    return (
        <div className={styles.faqList}>
            {faqData.map((faq, index) => (
                <div key={index} className={styles.faqItem}>
                    <button
                        className={styles.faqQuestion}
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
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
    );
}
