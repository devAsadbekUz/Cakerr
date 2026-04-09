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

/**
 * Step 1: Cake Type Selection
 */
export function TypeStep() {
    const { cakeType, setCakeType, options } = useCustomCake();
    const { t, lang } = useLanguage();
    const types = options.filter(o => o.type === 'cake_type');

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>{t('selectCakeType')}</h2>
            <div className={styles.typeGrid}>
                {types.map((type) => (
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
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Step 2: Design Details (Photo + Comment + Drawing)
 */
export function DesignStep() {
    const { photoRef, setPhotoRef, comment, setComment, drawingData, setDrawingData } = useCustomCake();
    const { t } = useLanguage();
    const [isDrawingOpen, setIsDrawingOpen] = useState(!!drawingData);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#BE185D');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Canvas Logic
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoRef(reader.result as string);
            };
            reader.readAsDataURL(file);
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
        if (canvas) setDrawingData(canvas.toDataURL());
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
            
            {/* 1. Upload Photo */}
            <div className={styles.designSection}>
                <div className={styles.uploadWrapper}>
                    <label className={styles.commentLabel}>1. {t('uploadPhoto')}</label>
                    {photoRef ? (
                        <div className={styles.previewContainer}>
                            <Image src={photoRef} alt="Reference" fill style={{ objectFit: 'cover' }} />
                            <button className={styles.removePhotoBtn} onClick={() => setPhotoRef(null)}>
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                            <Camera size={32} />
                            <span>{t('uploadPhoto')}</span>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                hidden 
                                accept="image/*" 
                                onChange={handleFileUpload} 
                            />
                        </div>
                    )}
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
                    <label className={styles.commentLabel}>3. {t('drawingMode')}</label>
                    <button 
                        className={styles.toggleBtn} 
                        style={{ width: 'auto', padding: '6px 12px' }}
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
 * Step 3: Nachinka (Ingredients) - Filtered by parent cake type
 */
export function NachinkaStep() {
    const { nachinka, setNachinka, cakeType, options } = useCustomCake();
    const { t, lang } = useLanguage();
    
    // Filter nachinka by parent cake type
    const availableNachinkas = options.filter(o => 
        o.type === 'nachinka' && (o.parent_id === cakeType || !o.parent_id)
    );

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>{t('selectNachinka')}</h2>
            <div className={styles.list}>
                {availableNachinkas.map((n) => (
                    <div
                        key={n.id}
                        className={`${styles.listItem} ${nachinka === n.id ? styles.listItemActive : ''}`}
                        onClick={() => setNachinka(n.id)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {n.image_url ? (
                                <div style={{ width: 40, height: 40, position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
                                    <Image src={n.image_url} alt={n.label_uz} fill style={{ objectFit: 'cover' }} />
                                </div>
                            ) : (
                                <div className={styles.iconWrapper} style={{ width: 40, height: 40 }}>
                                    <Palette size={20} />
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className={styles.label}>{lang === 'uz' ? n.label_uz : (n.label_ru || n.label_uz)}</span>
                                {n.sub_label_uz && (
                                    <span className={styles.subLabel}>
                                        {lang === 'uz' ? n.sub_label_uz : (n.sub_label_ru || n.sub_label_uz)}
                                    </span>
                                )}
                            </div>
                        </div>
                        {nachinka === n.id && <Check size={20} color="#BE185D" />}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Step 4: Size - Filtered by parent cake type
 */
export function SizeStep() {
    const { size, setSize, cakeType, options } = useCustomCake();
    const { t, lang } = useLanguage();
    
    // Filter sizes by parent cake type
    const availableSizes = options.filter(o => 
        o.type === 'size' && (o.parent_id === cakeType || !o.parent_id)
    );

    return (
        <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>{t('selectSize')}</h2>
            <div className={styles.sizeGrid}>
                {availableSizes.length > 0 ? (
                    availableSizes.map((s) => (
                        <div
                            key={s.id}
                            className={`${styles.sizeCard} ${size === s.id ? styles.sizeCardActive : ''}`}
                            onClick={() => setSize(s.id)}
                        >
                            <div className={styles.sizeCircle}>
                                <span>{s.label_uz.split(' ')[0]}</span>
                            </div>
                            <div className={styles.sizeInfo}>
                                <span className={styles.sizeLabel}>
                                    {lang === 'uz' ? s.label_uz : (s.label_ru || s.label_uz)}
                                </span>
                                {s.sub_label_uz && (
                                    <span className={styles.sizeSubLabel}>
                                        {lang === 'uz' ? s.sub_label_uz : (s.sub_label_ru || s.sub_label_uz)}
                                    </span>
                                )}
                            </div>
                            {size === s.id && <Check size={24} color="#BE185D" />}
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        {lang === 'uz' ? "Ushbu turdagi tort uchun o'lchamlar topilmadi." : "Размеры для этого типа торта не найдены."}
                    </div>
                )}
            </div>
            <div className={styles.pricingNote}>
                <Info size={18} />
                {t('customPriceNote')}
            </div>
        </div>
    );
}

/**
 * Final Step: Review
 */
export function ReviewStep() {
    const { cakeType, nachinka, size, photoRef, comment, drawingData, options } = useCustomCake();
    const { t, lang } = useLanguage();

    const getOptionLabel = (id: string | null) => {
        const option = options.find(o => o.id === id);
        if (!option) return t('notSelected');
        return lang === 'uz' ? option.label_uz : (option.label_ru || option.label_uz);
    };

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

                {photoRef && (
                    <div className={styles.summarySection}>
                        <h4 className={styles.summarySubTitle}>{t('photoRefLabel')}:</h4>
                        <div className={styles.summaryPhotoWrapper}>
                            <Image src={photoRef} alt="Photo Reference" fill style={{ objectFit: 'cover' }} />
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
        </div>
    );
}
