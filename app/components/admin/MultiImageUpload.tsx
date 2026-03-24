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
import { createClient } from '@/app/utils/supabase/client';
import Image from 'next/image';
import { Upload, X, Loader2, GripVertical } from 'lucide-react';
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

function SortableImage({ id, url, onRemove }: SortableItemProps) {
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

    return (
        <div ref={setNodeRef} style={style} className={styles.item}>
            <Image 
                src={url} 
                alt="Product" 
                fill 
                className={styles.image}
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 33vw, 150px"
            />
            
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

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
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
                newUrls.push(data.publicUrl);
            }

            onChange(newUrls);
        } catch (error: any) {
            alert('Yuklashda xatolik: ' + error.message);
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
