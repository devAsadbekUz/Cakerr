'use client';

import React from 'react';
import { Upload } from 'lucide-react';
import styles from './PhotoUploadForm.module.css';

interface PhotoDropZoneProps {
    isDragging: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onClick: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PhotoDropZone({
    isDragging,
    onDragOver,
    onDragLeave,
    onDrop,
    onClick,
    fileInputRef,
    onFileChange
}: PhotoDropZoneProps) {
    return (
        <div
            className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={onClick}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept="image/*"
                hidden
            />
            <div className={styles.uploadIcon}>
                <Upload size={32} />
            </div>
            <p>Rasm yuklash uchun bosing yoki shu yerga tashlang</p>
        </div>
    );
}
