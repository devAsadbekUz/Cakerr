'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import styles from './Steps.module.css';
import {
    Upload, MessageSquare, Pencil, Trash2, Check,
    X, Camera, Star, Info, Palette, Layers, Maximize
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { compressImage, validateImage } from '@/app/utils/image-utils';

/**
 * Step 1: Cake Type Selection
 */
export function TypeStep({ loading }: { loading: boolean }) {
    const { cakeType, setCakeType, options } = useCustomCake();
    const { t, lang } = useLanguage();
    const types = options.filter(o => o.type === 'cake_type');

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>{t('selectCakeType')}</h2>
            <div className={styles.typeGrid}>
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`${styles.typeCard} ${styles.skeleton}`} style={{ height: '180px' }} />
                    ))
                ) : (
                    types.map((type) => (
                        <div
                            key={type.id}
                            className={`${styles.typeCard} ${cakeType === type.id ? styles.typeCardActive : ''}`}
                            onClick={() => setCakeType(type.id)}
                        >
                            <div className={styles.typeImageWrapper}>
                                {type.image_url ? (
                                    <Image
                                        src={type.image_url}
                                        alt={lang === 'uz' ? type.label_uz : (type.label_ru || type.label_uz)}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div className={styles.iconWrapper} style={{ width: '100%', height: '100%', borderRadius: 0 }}>
                                        <Palette size={32} />
                                    </div>
                                )}
                            </div>
                            <span className={styles.typeLabel}>
                                {lang === 'uz' ? type.label_uz : (type.label_ru || type.label_uz)}
                            </span>
                            <span className={styles.typePrice}>
                                {Number(type.price) > 0 ? `+ ${Number(type.price).toLocaleString()} ${t('som')}` : t('negotiable')}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

/**
 * Step 2: Design Details (Photo + Comment + Drawing)
 */
export function DesignStep() {
    const { photoRefs, setPhotoRef, comment, setComment, drawingData, setDrawingData } = useCustomCake();
    const { t } = useLanguage();
    const [isDrawingOpen, setIsDrawingOpen] = useState(!!drawingData);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#BE185D');
    // We use two refs because we have two separate file inputs now
    const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    // Canvas Logic (unchanged)
    useEffect(() => {
        if (isDrawingOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context) {
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
                context.lineCap = 'round';
                context.lineJoin = 'round';
                context.lineWidth = 4;
                context.strokeStyle = color;

                if (drawingData) {
                    const img = new window.Image();
                    img.onload = () => context.drawImage(img, 0, 0);
                    img.src = drawingData;
                }
            }
        }
    }, [isDrawingOpen, drawingData, color]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (file) {
            // 1. Validation
            const validation = validateImage(file, 10);
            if (!validation.valid) {
                alert(validation.error);
                return;
            }

            try {
                // 2. Standardized Compression (Aggressive: 800x800, 0.6 quality)
                const optimizedFile = await compressImage(file, 800, 800, 0.6);

                // 3. Convert back to Data URL for the state/cart context
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPhotoRef(index, reader.result as string);
                };
                reader.readAsDataURL(optimizedFile);
            } catch (err) {
                console.error('[DesignStep] Compression failed, falling back to original:', err);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPhotoRef(index, reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        }
    };

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
        if (canvas) setDrawingData(canvas.toDataURL('image/jpeg', 0.6));
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
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (context) context.clearRect(0, 0, canvas.width, canvas.height);
        setDrawingData('');
    };

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>{t('stepDesign')}</h2>

            <div className={styles.optionalBanner}>
                <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{t('designOptionalNote')}</span>
            </div>

            {/* 1. Upload Photos (Max 2) */}
            <div className={styles.designSection}>
                <label className={styles.commentLabel}>1. {t('uploadPhoto')} (max 2)</label>
                <div className={styles.photoUploadGrid}>
                    {[0, 1].map((idx) => (
                        <div key={idx} className={styles.uploadWrapper}>
                            {photoRefs[idx] ? (
                                <div className={styles.previewContainer}>
                                    <Image src={photoRefs[idx]!} alt={`Ref ${idx + 1}`} fill style={{ objectFit: 'cover' }} />
                                    <button className={styles.removePhotoBtn} onClick={() => setPhotoRef(idx, null)}>
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.uploadBtn} onClick={() => fileInputRefs[idx].current?.click()}>
                                    <Camera size={28} />
                                    <span style={{ fontSize: '13px' }}>{t('uploadPhoto')} {idx + 1}</span>
                                    <input
                                        type="file"
                                        ref={fileInputRefs[idx]}
                                        hidden
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, idx)}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Comment */}
            <div className={styles.designSection}>
                <div className={styles.commentWrapper}>
                    <label className={styles.commentLabel}>2. {t('commentLabel')}</label>
                    <textarea
                        className={styles.textarea}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={t('commentPlaceholder')}
                    />
                </div>
            </div>

            {/* 3. Drawing Tool */}
            <div className={styles.designSection}>
                <div className={styles.drawingHeader}>
                    <label className={styles.commentLabel}>3. {t('drawingRefLabel')}</label>
                    <button
                        className={styles.toggleBtn}
                        style={{ width: 'auto', padding: '8px 12px' }}
                        onClick={() => setIsDrawingOpen(!isDrawingOpen)}
                    >
                        {isDrawingOpen ? <X size={16} /> : <Pencil size={16} />}
                        {isDrawingOpen ? t('cancel') : t('drawingMode')}
                    </button>
                </div>

                {isDrawingOpen && (
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
                                {['#BE185D', '#000000', '#2563EB', '#16A34A', '#D97706'].map(c => (
                                    <div
                                        key={c}
                                        className={`${styles.colorBtn} ${color === c ? styles.colorBtnActive : ''}`}
                                        style={{ background: c }}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </div>
                            <button className={styles.clearBtn} onClick={clearCanvas}>
                                <Trash2 size={16} />
                                {t('clearCanvas')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.encouragement}>
                <Info size={14} />
                {t('adminMayChange')}
            </div>
        </div>
    );
}

/**
 * Step 3: Nachinka (Ingredients) - Filtered by parent cake type (unchanged code skipped for brevity, but stays same)
 */
// ... (NachinkaStep and SizeStep stays here)

/**
 * Final Step: Review
 */
export function ReviewStep() {
    const { cakeType, nachinka, size, photoRefs, comment, drawingData, options, isFullyPriced, calculateTotal } = useCustomCake();
    const { t, lang } = useLanguage();
    const total = calculateTotal();

    const getOptionLabel = (id: string | null) => {
        const option = options.find(o => o.id === id);
        if (!option) return t('notSelected');
        return lang === 'uz' ? option.label_uz : (option.label_ru || option.label_uz);
    };

    const hasPhotos = photoRefs.some(ref => ref !== null);

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>{t('yourSelection')}</h2>
            <div className={styles.summaryCard}>
                <div className={styles.summaryTable}>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>{t('stepType')}:</span>
                        <span className={styles.summaryValue}>{getOptionLabel(cakeType)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>{t('stepNachinka')}:</span>
                        <span className={styles.summaryValue}>{getOptionLabel(nachinka)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>{t('stepSize')}:</span>
                        <span className={styles.summaryValue}>{getOptionLabel(size)}</span>
                    </div>
                </div>

                {hasPhotos && (
                    <div className={styles.summarySection}>
                        <h4 className={styles.summarySubTitle}>{t('photoRefLabel')}:</h4>
                        <div className={styles.reviewPhotoGrid}>
                            {photoRefs.map((ref, idx) => ref && (
                                <div key={idx} className={styles.summaryPhotoWrapper}>
                                    <Image src={ref} alt={`Photo ${idx + 1}`} fill style={{ objectFit: 'cover' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {comment && (
                    <div className={styles.summarySection}>
                        <h4 className={styles.summarySubTitle}>{t('commentLabel')}:</h4>
                        <p className={styles.summaryText}>{comment}</p>
                    </div>
                )}

                {drawingData && (
                    <div className={styles.summarySection}>
                        <h4 className={styles.summarySubTitle}>{t('drawingRefLabel')}:</h4>
                        <div className={styles.summaryDrawingWrapper}>
                            <Image src={drawingData} alt="Drawing" fill unoptimized style={{ objectFit: 'contain' }} />
                        </div>
                    </div>
                )}
            </div>

            {!isFullyPriced && total === 0 && (
                <div style={{
                    marginTop: '12px',
                    padding: '16px',
                    background: '#FDF2F8',
                    borderRadius: '20px',
                    textAlign: 'center',
                    color: '#BE185D',
                    fontWeight: 600,
                    fontSize: '14px',
                    border: '1.5px dashed #FCE7F3'
                }}>
                    {t('customPriceNote')}
                </div>
            )}
        </div>
    );
}
