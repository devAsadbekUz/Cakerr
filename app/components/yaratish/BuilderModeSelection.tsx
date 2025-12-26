'use client';

import React from 'react';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import { Wand2, ImagePlus } from 'lucide-react';
import styles from './BuilderModeSelection.module.css';

export default function BuilderModeSelection() {
    const { setMode } = useCustomCake();

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Tortni qanday yaratmoqchisiz?</h2>
            <div className={styles.cards}>
                <button
                    className={`${styles.card} ${styles.cardWizard}`}
                    onClick={() => setMode('wizard')}
                >
                    <div className={styles.badge}>🔥 Eng mashhur</div>
                    <div className={styles.iconWrapper}>
                        <Wand2 size={40} />
                    </div>
                    <div className={styles.textWrapper}>
                        <h3>Konstruktor</h3>
                        <p>Ta'bga ko'ra yig'ing</p>
                    </div>
                </button>

                <button
                    className={`${styles.card} ${styles.cardUpload}`}
                    onClick={() => setMode('upload')}
                >
                    <div className={styles.iconWrapper}>
                        <ImagePlus size={40} />
                    </div>
                    <div className={styles.textWrapper}>
                        <h3>Rasm Yuklash</h3>
                        <p>Rasm orqali buyurtma</p>
                    </div>
                </button>
            </div>
        </div>
    );
}
