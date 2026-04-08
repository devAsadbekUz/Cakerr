'use client';

import React from 'react';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import { Wand2, ImagePlus } from 'lucide-react';
import styles from './BuilderModeSelection.module.css';
import { useLanguage } from '@/app/context/LanguageContext';

export default function BuilderModeSelection() {
    const { setMode } = useCustomCake();
    const { t } = useLanguage();

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>{t('howToCreate')}</h2>
            <div className={styles.cards}>
                <button
                    className={styles.card}
                    onClick={() => setMode('wizard')}
                >
                    <div className={styles.iconWrapper}>
                        <Wand2 size={48} />
                    </div>
                    <h3>{t('stepByStep')}</h3>
                    <p>{t('stepByStepDesc')}</p>
                </button>

                <button
                    className={styles.card}
                    onClick={() => setMode('upload')}
                >
                    <div className={styles.iconWrapper}>
                        <ImagePlus size={48} />
                    </div>
                    <h3>{t('uploadPhoto')}</h3>
                    <p>{t('uploadPhotoDesc')}</p>
                </button>
            </div>
        </div>
    );
}
