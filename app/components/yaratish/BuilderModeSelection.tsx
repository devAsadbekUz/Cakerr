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
                    className={styles.card}
                    onClick={() => setMode('wizard')}
                >
                    <div className={styles.iconWrapper}>
                        <Wand2 size={48} />
                    </div>
                    <h3>Bosqichma-bosqich</h3>
                    <p>Shakl, hajm va bezaklarni o'zingiz tanlang</p>
                </button>

                <button
                    className={styles.card}
                    onClick={() => setMode('upload')}
                >
                    <div className={styles.iconWrapper}>
                        <ImagePlus size={48} />
                    </div>
                    <h3>Rasm yuklash</h3>
                    <p>O'zingiz yoqtirgan tort rasmini yuklang</p>
                </button>
            </div>
        </div>
    );
}
