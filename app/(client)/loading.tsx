'use client';
import { useLanguage } from '@/app/context/LanguageContext';
import styles from './loading.module.css';

export default function ClientLoading() {
    const { t } = useLanguage();
    return (
        <div className={styles.container}>
            <div className={styles.spinner} />
            <p className={styles.text}>{t('loading')}</p>
        </div>
    );
}
