'use client';

import React from 'react';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import styles from './Steps.module.css';
import {
    Circle, Square, Heart, Maximize2, Move, Minimize2,
    Cookie, Droplets, Utensils, Wheat, IceCream, Coffee,
    Check, MessageCircle, Pencil, Trash2, Palette, Type
} from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { CAKE_OPTIONS } from '@/app/config/cakeBuilderConfig';

// Icon mappings (since we can't store components in JSON config easily)
const SHAPE_ICONS: Record<string, any> = {
    round: Circle,
    square: Square,
    heart: Heart
};

const SIZE_ICONS: Record<string, any> = {
    small: Minimize2,
    medium: Move,
    large: Maximize2
};

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

export function ShapeStep() {
    const { shape, setShape } = useCustomCake();

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>Tort shaklini tanlang</h2>
            <div className={styles.grid}>
                {CAKE_OPTIONS.shapes.map((s) => {
                    const Icon = SHAPE_ICONS[s.id] || Circle;
                    return (
                        <div
                            key={s.id}
                            className={`${styles.card} ${shape === s.id ? styles.cardActive : ''}`}
                            onClick={() => setShape(s.id)}
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

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>O'lchamini tanlang</h2>
            <div className={styles.grid}>
                {CAKE_OPTIONS.sizes.map((s) => {
                    const Icon = SIZE_ICONS[s.id] || Move;
                    return (
                        <div
                            key={s.id}
                            className={`${styles.card} ${size === s.id ? styles.cardActive : ''}`}
                            onClick={() => setSize(s.id)}
                        >
                            <div className={styles.iconWrapper}>
                                <Icon size={32} />
                            </div>
                            <span className={styles.label}>{s.label}</span>
                            <span className={styles.diameter}>{s.diameter} sm</span>
                            <span className={styles.price}>x{s.priceMultiplier}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function SpongeStep() {
    const { sponge, setSponge } = useCustomCake();

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>Biskvit (Asos) turini tanlang</h2>
            <div className={styles.grid}>
                {CAKE_OPTIONS.sponges.map((s) => {
                    const Icon = SPONGE_ICONS[s.id] || IceCream;
                    return (
                        <div
                            key={s.id}
                            className={`${styles.card} ${sponge === s.id ? styles.cardActive : ''}`}
                            onClick={() => setSponge(s.id)}
                        >
                            <div className={styles.iconWrapper} style={{ color: s.color }}>
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

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>Krem turini tanlang</h2>
            <div className={styles.grid}>
                {CAKE_OPTIONS.creams.map((c) => {
                    const Icon = CREAM_ICONS[c.id] || Coffee;
                    return (
                        <div
                            key={c.id}
                            className={`${styles.card} ${cream === c.id ? styles.cardActive : ''}`}
                            onClick={() => setCream(c.id)}
                        >
                            <div className={styles.iconWrapper} style={{ color: c.color }}>
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
    const { decorations, toggleDecoration, text, setText, drawingData, setDrawingData } = useCustomCake();
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
                    const img = new Image();
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
            <h2 className={styles.stepTitle}>Bezaklarni qo'shing</h2>
            <div className={styles.list}>
                {CAKE_OPTIONS.decorations.map((d) => (
                    <div
                        key={d.id}
                        className={`${styles.listItem} ${decorations.includes(d.id) ? styles.listItemActive : ''}`}
                        onClick={() => toggleDecoration(d.id)}
                    >
                        <span className={styles.label}>{d.label}</span>
                        {decorations.includes(d.id) && <Check size={20} color="hsl(var(--color-primary))" />}
                    </div>
                ))}
            </div>

            <div className={styles.textInputSection}>
                <h3 className={styles.subTitle}>Maxsus xabar</h3>

                <div className={styles.toggleContainer}>
                    <button
                        className={`${styles.toggleBtn} ${mode === 'text' ? styles.toggleBtnActive : ''}`}
                        onClick={() => setMode('text')}
                    >
                        <Type size={18} />
                        Matn
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${mode === 'drawing' ? styles.toggleBtnActive : ''}`}
                        onClick={() => setMode('drawing')}
                    >
                        <Pencil size={18} />
                        Chizish
                    </button>
                </div>

                {mode === 'text' ? (
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
                                Tozalash
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function ReviewStep() {
    const { shape, size, sponge, cream, decorations, text, drawingData } = useCustomCake();

    // Helper to find label by ID
    const getShapeLabel = (id: string | null) => CAKE_OPTIONS.shapes.find(s => s.id === id)?.label || id;
    const getSizeLabel = (id: string | null) => CAKE_OPTIONS.sizes.find(s => s.id === id)?.label || id;
    const getSpongeLabel = (id: string | null) => CAKE_OPTIONS.sponges.find(s => s.id === id)?.label || id;
    const getCreamLabel = (id: string | null) => CAKE_OPTIONS.creams.find(c => c.id === id)?.label || id;
    const getDecorationLabel = (id: string) => CAKE_OPTIONS.decorations.find(d => d.id === id)?.label || id;

    const summaryItems = [
        { label: 'Shakl', value: getShapeLabel(shape) },
        { label: 'Hajm', value: getSizeLabel(size) },
        { label: 'Biskvit', value: getSpongeLabel(sponge) },
        { label: 'Krem', value: getCreamLabel(cream) },
    ];

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>Sizning tanlovingiz</h2>
            <div className={styles.summaryCard}>
                <div className={styles.summaryTable}>
                    {summaryItems.map((item) => (
                        <div key={item.label} className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>{item.label}:</span>
                            <span className={styles.summaryValue}>{item.value || 'Tanlanmagan'}</span>
                        </div>
                    ))}
                </div>

                {decorations.length > 0 && (
                    <div className={styles.summarySection}>
                        <h4 className={styles.summarySubTitle}>Bezaklar:</h4>
                        <div className={styles.tagCloud}>
                            {decorations.map(d => (
                                <span key={d} className={styles.tag}>{getDecorationLabel(d)}</span>
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

                {drawingData && (
                    <div className={styles.summarySection}>
                        <h4 className={styles.summarySubTitle}>Chizilgan Rasm:</h4>
                        <img src={drawingData} alt="Custom Drawing" style={{ width: '100%', borderRadius: 8, border: '1px solid #eee' }} />
                    </div>
                )}
            </div>
        </div>
    );
}
