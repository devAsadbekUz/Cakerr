'use client';

import React from 'react';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import styles from './Steps.module.css';
import {
    Circle, Square, Heart, Maximize2, Move, Minimize2,
    Cookie, Droplets, Utensils, Wheat, IceCream, Coffee,
    Check, MessageCircle
} from 'lucide-react';

export function ShapeStep() {
    const { shape, setShape } = useCustomCake();

    const shapes = [
        { id: 'round', label: 'Dumaloq', icon: Circle },
        { id: 'square', label: 'To\'rtburchak', icon: Square },
        { id: 'heart', label: 'Yurak', icon: Heart },
    ];

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>Tort shaklini tanlang</h2>
            <div className={styles.grid}>
                {shapes.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div
                            key={s.id}
                            className={`${styles.card} ${shape === s.id ? styles.cardActive : ''}`}
                            onClick={() => setShape(s.id as any)}
                        >
                            <div className={styles.iconWrapper}>
                                <Icon size={32} />
                            </div>
                            <span className={styles.label}>{s.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function SizeStep() {
    const { size, setSize } = useCustomCake();

    const sizes = [
        { id: 'small', label: 'Kichik', desc: '2 kishilik', icon: Minimize2 },
        { id: 'medium', label: 'O\'rtacha', desc: '4-6 kishilik', icon: Move },
        { id: 'large', label: 'Katta', desc: '8-10 kishilik', icon: Maximize2 },
    ];

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>O'lchamini tanlang</h2>
            <div className={styles.grid}>
                {sizes.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div
                            key={s.id}
                            className={`${styles.card} ${size === s.id ? styles.cardActive : ''}`}
                            onClick={() => setSize(s.id as any)}
                        >
                            <div className={styles.iconWrapper}>
                                <Icon size={32} />
                            </div>
                            <span className={styles.label}>{s.label}</span>
                            <span className={styles.price}>{s.desc}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function SpongeStep() {
    const { sponge, setSponge } = useCustomCake();

    const sponges = [
        { id: 'vanilla', label: 'Vanilli', icon: IceCream },
        { id: 'chocolate', label: 'Shokoladli', icon: Cookie },
        { id: 'red-velvet', label: 'Red Velvet', icon: Utensils },
    ];

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>Biskvit (Asos) turini tanlang</h2>
            <div className={styles.grid}>
                {sponges.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div
                            key={s.id}
                            className={`${styles.card} ${sponge === s.id ? styles.cardActive : ''}`}
                            onClick={() => setSponge(s.id as any)}
                        >
                            <div className={styles.iconWrapper}>
                                <Icon size={32} />
                            </div>
                            <span className={styles.label}>{s.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function CreamStep() {
    const { cream, setCream } = useCustomCake();

    const creams = [
        { id: 'choco', label: 'Shokoladli', icon: Coffee },
        { id: 'berry', label: 'Rezavorli', icon: Droplets },
        { id: 'cheese', label: 'Tvorogli / Pishloqli', icon: Wheat },
    ];

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>Krem turini tanlang</h2>
            <div className={styles.grid}>
                {creams.map((c) => {
                    const Icon = c.icon;
                    return (
                        <div
                            key={c.id}
                            className={`${styles.card} ${cream === c.id ? styles.cardActive : ''}`}
                            onClick={() => setCream(c.id as any)}
                        >
                            <div className={styles.iconWrapper}>
                                <Icon size={32} />
                            </div>
                            <span className={styles.label}>{c.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function DecorationStep() {
    const { decorations, toggleDecoration, text, setText } = useCustomCake();

    const decorationOptions = [
        'Meva va rezavorlar',
        'Shokolad parchalari',
        'Makaronlar',
        'Yong\'oqlar',
        'Rangli sepma',
        'Oltin barglar'
    ];

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>Bezaklarni qo'shing</h2>
            <div className={styles.list}>
                {decorationOptions.map((d) => (
                    <div
                        key={d}
                        className={`${styles.listItem} ${decorations.includes(d) ? styles.listItemActive : ''}`}
                        onClick={() => toggleDecoration(d)}
                    >
                        <span className={styles.label}>{d}</span>
                        {decorations.includes(d) && <Check size={20} color="hsl(var(--color-primary))" />}
                    </div>
                ))}
            </div>

            <div className={styles.textInputSection}>
                <h3 className={styles.subTitle}>Tortdagi yozuv</h3>
                <div className={styles.inputWrapper}>
                    <MessageCircle size={20} className={styles.inputIcon} />
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Masalan: Tug'ilgan kuning bilan!"
                        className={styles.input}
                    />
                </div>
            </div>
        </div>
    );
}

export function ReviewStep() {
    const { shape, size, sponge, cream, decorations, text } = useCustomCake();

    const summaryItems = [
        { label: 'Shakl', value: shape },
        { label: 'Hajm', value: size },
        { label: 'Biskvit', value: sponge },
        { label: 'Krem', value: cream },
    ];

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>Sizning tanlovingiz</h2>
            <div className={styles.summaryCard}>
                <div className={styles.summaryTable}>
                    {summaryItems.map((item) => (
                        <div key={item.label} className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>{item.label}:</span>
                            <span className={styles.summaryValue}>{item.value}</span>
                        </div>
                    ))}
                </div>

                {decorations.length > 0 && (
                    <div className={styles.summarySection}>
                        <h4 className={styles.summarySubTitle}>Bezaklar:</h4>
                        <div className={styles.tagCloud}>
                            {decorations.map(d => (
                                <span key={d} className={styles.tag}>{d}</span>
                            ))}
                        </div>
                    </div>
                )}

                {text && (
                    <div className={styles.summarySection}>
                        <h4 className={styles.summarySubTitle}>Yozuv:</h4>
                        <p className={styles.summaryText}>"{text}"</p>
                    </div>
                )}
            </div>
        </div>
    );
}
