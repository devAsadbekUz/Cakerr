'use client';

import React, { useState, useRef } from 'react';
import { 
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { uploadImageAction } from '@/app/actions/image-actions';
import { compressImage, validateImage } from '@/app/utils/image-utils';
import Image from 'next/image';
import { Upload, X, Loader2, GripVertical, ImageOff } from 'lucide-react';
import styles from './MultiImageUpload.module.css';

interface MultiImageUploadProps {
    value: string[];
    onChange: (urls: string[]) => void;
    bucket?: string;
}

interface SortableItemProps {
    id: string;
    url: string;
    onRemove: (url: string) => void;
}

function SortableImage({ id, url, onRemove, version, onReload }: SortableItemProps & { version: number; onReload: () => void }) {
    const [hasError, setHasError] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    const displayUrl = `${url}${url.includes('?') ? '&' : '?'}v=${version}`;

    return (
        <div ref={setNodeRef} style={style} className={styles.item}>
            <Image 
                src={displayUrl} 
                alt="Product" 
                fill 
                className={styles.image}
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 33vw, 150px"
                onError={() => setHasError(true)}
            />

            {hasError && (
                <div className={styles.errorOverlay}>
                    <ImageOff size={18} />
                    <span style={{ fontSize: '9px', fontWeight: 600 }}>Xatolik</span>
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setHasError(false);
                            onReload();
                        }}
                        style={{
                            marginTop: '4px',
                            padding: '2px 6px',
                            background: 'white',
                            border: '1px solid #FECACA',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Yangilash
                    </button>
                </div>
            )}
            
            {/* Drag Handle Overlay */}
            <div 
                {...attributes} 
                {...listeners}
                className={styles.dragHandle}
            >
                <GripVertical className="text-white" size={24} />
            </div>

            {/* Remove Button */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(url);
                }}
                className={styles.removeBtn}
            >
                <X size={14} />
            </button>
            
            {/* Badge for Primary Image */}
            {id === '0' && (
                <div className={styles.primaryBadge}>
                    ASOSIY
                </div>
            )}
        </div>
    );
}

export default function MultiImageUpload({ value = [], onChange, bucket = 'images' }: MultiImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [version, setVersion] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleReload = () => setVersion(v => v + 1);

    // Fix: Add distance threshold to PointerSensor to prevent it from intercepting clicks
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px movement required before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            setUploading(true);
            const newUrls: string[] = [...value];

            for (const file of files) {
                // 1. HEIC Detection (iPhone format)
                const isHEIC = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
                if (isHEIC) {
                    alert("iPhone formatidagi rasm (.HEIC) aniqlandi. Iltimos, uni JPG rasmga aylantiring yoki boshqa rasm yuklang. (iPhone HEIC format detected. Please convert to JPG.)");
                    continue;
                }

                // 2. Validation
                const validation = validateImage(file);
                if (!validation.valid) {
                    alert(validation.error);
                    continue;
                }

                // 3. Compression (to avoid 413 Payload Too Large)
                const optimizedFile = await compressImage(file);

                const formData = new FormData();
                formData.append('file', optimizedFile);
                formData.append('bucket', bucket);

                const result = await uploadImageAction(formData);

                if (result.error) {
                    // Provide a more helpful message for common failures
                    if (result.error.includes('unexpected response')) {
                        throw new Error("Server bilan bog'lanishda xatolik. Rasm juda katta bo'lishi mumkin. (Network error, the image might be too large)");
                    }
                    throw new Error(result.error);
                }
                
                if (result.url) {
                    newUrls.push(result.url);
                }
            }

            onChange(newUrls);
        } catch (error: any) {
            console.error('[MultiImageUpload] Upload error:', error);
            alert("Yuklashda xatolik (Upload error): " + error.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = (urlToRemove: string) => {
        onChange(value.filter(url => url !== urlToRemove));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = parseInt(active.id.toString());
            const newIndex = parseInt(over.id.toString());
            const newArray = arrayMove(value, oldIndex, newIndex);
            onChange(newArray);
        }
    };

    const items = value.map((url, index) => ({ id: index.toString(), url }));

    return (
        <div className={styles.container}>
            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className={styles.grid}>
                    <SortableContext 
                        items={items.map(i => i.id)}
                        strategy={rectSortingStrategy}
                    >
                        {items.map((item) => (
                            <SortableImage 
                                key={item.id} 
                                id={item.id} 
                                url={item.url} 
                                onRemove={handleRemove} 
                                version={version}
                                onReload={handleReload}
                            />
                        ))}
                    </SortableContext>

                    {/* Add More Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={styles.addButton}
                    >
                        {uploading ? (
                            <Loader2 className={styles.spinner} size={24} />
                        ) : (
                            <>
                                <Upload className={styles.addIcon} size={24} />
                                <span className={styles.addText}>Qo'shish</span>
                            </>
                        )}
                    </button>
                </div>
            </DndContext>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept="image/*"
                multiple
                hidden
            />
            
            {value.length > 0 && (
                <p className={styles.helperText}>
                    * Rasmlarni siljitish orqali tartibni o'zgartirishingiz mumkin. Birinchi rasm asosiy rasm hisoblanadi.
                </p>
            )}
        </div>
    );
}
