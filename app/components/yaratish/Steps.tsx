'use client';

import React from 'react';
import Image from 'next/image';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import styles from './Steps.module.css';
import {
    Circle, Square, Heart, Maximize2, Move, Minimize2,
    Cookie, Droplets, Utensils, Wheat, IceCream, Coffee,
    Check, MessageCircle, Pencil, Trash2, Palette, Type, Info,
    Star, Triangle, Hexagon
} from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';
// CAKE_OPTIONS no longer used for shapes — shapes are DB-driven via custom_cake_options

const SPONGE_ICONS: Record<string, any> = {
    vanilla: IceCream,
    chocolate: Cookie,
    'red-velvet': Utensils
};

const CREAM_ICONS: Record<string, any> = {
    choco: Coffee,
    berry: Droplets,
    cheese: Wheat
};

export function SpongeStep() {
    const { sponge, setSponge, options } = useCustomCake();
    const { t } = useLanguage();
    const sponges = options.filter(o => o.type === 'sponge');

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>{t('selectSponge')}</h2>
            <div className={styles.grid}>
                {sponges.map((s) => (
                    <div
                        key={s.id}
                        className={`${styles.card} ${sponge === s.id ? styles.cardActive : ''}`}
                        onClick={() => setSponge(s.id)}
                    >
                        <div className={styles.iconWrapper}>
                            <Cookie size={32} />
                        </div>
                        <span className={styles.label}>{s.label}</span>
                        {s.price > 0 && <span className={styles.price}>+{s.price.toLocaleString()} {t('som')}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function CreamStep() {
    const { cream, setCream, options } = useCustomCake();
    const { t } = useLanguage();
    const creams = options.filter(o => o.type === 'cream');

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>{t('selectCream')}</h2>
            <div className={styles.grid}>
                {creams.map((c) => (
                    <div
                        key={c.id}
                        className={`${styles.card} ${cream === c.id ? styles.cardActive : ''}`}
                        onClick={() => setCream(c.id)}
                    >
                        {c.image_url ? (
                            <Image src={c.image_url} alt={c.label} className={styles.cardImage} style={{ borderRadius: '50%', objectFit: 'cover' }} width={60} height={60} />
                        ) : (
                            <div className={styles.iconWrapper}>
                                <Droplets size={32} />
                            </div>
                        )}
                        <span className={styles.label}>{c.label}</span>
                        {c.price > 0 && <span className={styles.price}>+{c.price.toLocaleString()} {t('som')}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DecorationStep() {
    const { decorations, toggleDecoration, text, setText, drawingData, setDrawingData, options } = useCustomCake();
    const { t } = useLanguage();
    const decors = options.filter(o => o.type === 'decoration');
    const [mode, setMode] = useState<'text' | 'drawing'>('text');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');

    // Initialize canvas with existing drawing if available
    useEffect(() => {
        if (mode === 'drawing' && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context) {
                // Set canvas size (visual size is controlled by CSS, but internal size needs to be set)
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;

                context.lineCap = 'round';
                context.lineJoin = 'round';
                context.lineWidth = 3;
                context.strokeStyle = color;

                if (drawingData) {
                    const img = new window.Image();
                    img.onload = () => context.drawImage(img, 0, 0);
                    img.src = drawingData;
                }
            }
        }
    }, [mode, drawingData]); // Re-run when mode changes

    // Update stroke color
    useEffect(() => {
        if (canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) context.strokeStyle = color;
        }
    }, [color]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        setIsDrawing(true);
        const { x, y } = getCoordinates(e, canvas);
        context.beginPath();
        context.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const { x, y } = getCoordinates(e, canvas);
        context.lineTo(x, y);
        context.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Save drawing to context
        setDrawingData(canvas.toDataURL());
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        setDrawingData('');
    };

    const colors = ['#000000', '#FF4081', '#2196F3', '#4CAF50', '#FFC107'];

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>{t('addDecorations')}</h2>
            <div className={styles.list}>
                {decors.map((d) => (
                    <div
                        key={d.id}
                        className={`${styles.listItem} ${decorations.includes(d.id) ? styles.listItemActive : ''}`}
                        onClick={() => toggleDecoration(d.id)}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className={styles.label}>{d.label}</span>
                            {d.price > 0 && <span style={{ fontSize: 13, color: '#BE185D', fontWeight: 600 }}>+{d.price.toLocaleString()} {t('som')}</span>}
                        </div>
                        {decorations.includes(d.id) && <Check size={20} color="#BE185D" />}
                    </div>
                ))}
            </div>

            <div className={styles.textInputSection}>
                <h3 className={styles.subTitle}>{t('specialMessage')}</h3>

                <div className={styles.toggleContainer}>
                    <button
                        className={`${styles.toggleBtn} ${mode === 'text' ? styles.toggleBtnActive : ''}`}
                        onClick={() => setMode('text')}
                    >
                        <Type size={18} />
                        {t('textMode')}
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${mode === 'drawing' ? styles.toggleBtnActive : ''}`}
                        onClick={() => setMode('drawing')}
                    >
                        <Pencil size={18} />
                        {t('drawingMode')}
                    </button>
                </div>

                {mode === 'text' ? (
                    <div className={styles.inputWrapper}>
                        <MessageCircle size={20} className={styles.inputIcon} />
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={t('messagePlaceholder')}
                            className={styles.input}
                        />
                    </div>
                ) : (
                    <div className={styles.drawingWrapper}>
                        <div className={styles.canvasContainer}>
                            <canvas
                                ref={canvasRef}
                                className={styles.canvas}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                        </div>
                        <div className={styles.canvasTools}>
                            <div className={styles.colorPalette}>
                                {colors.map(c => (
                                    <div
                                        key={c}
                                        className={`${styles.colorBtn} ${color === c ? styles.colorBtnActive : ''}`}
                                        style={{ background: c }}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </div>
                            <button className={styles.clearBtn} onClick={clearCanvas}>
                                <Trash2 size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                {t('clearCanvas')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function ReviewStep() {
    const { sponge, cream, decorations, text, drawingData, options, calculateTotal } = useCustomCake();
    const { t } = useLanguage();

    // Helper to find label by ID from DB (works for all types)
    const getOptionLabel = (id: string | null) => options.find(o => o.id === id)?.label || t('notSelected');

    const summaryItems = [
        { label: t('stepSponge'), value: getOptionLabel(sponge) },
        { label: t('stepCream'), value: getOptionLabel(cream) },
    ];

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>{t('yourSelection')}</h2>
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
                        <h4 className={styles.summarySubTitle}>{t('decorations')}:</h4>
                        <div className={styles.tagCloud}>
                            {decorations.map(dId => (
                                <span key={dId} className={styles.tag}>{getOptionLabel(dId)}</span>
                            ))}
                        </div>
                    </div>
                )}

                {text && (
                    <div className={styles.summarySection}>
                        <h4 className={styles.summarySubTitle}>{t('inscriptionLabel')}:</h4>
                        <p className={styles.summaryText}>"{text}"</p>
                    </div>
                )}

                {drawingData && (
                    <div className={styles.summarySection}>
                        <h4 className={styles.summarySubTitle}>{t('drawingLabel')}:</h4>
                        <div className={styles.summaryDrawingWrapper}>
                            <Image src={drawingData} alt="Custom Drawing" fill unoptimized style={{ objectFit: 'contain' }} />
                        </div>
                    </div>
                )}

                <div className={styles.totalEstimated}>
                    <div>
                        <span className={styles.totalLabel}>{t('estimatedPrice')}</span>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t('adminMayChange')}</div>
                    </div>
                    <div className={styles.totalValue}>{calculateTotal().toLocaleString()} {t('som')}</div>
                </div>
            </div>
        </div>
    );
}
