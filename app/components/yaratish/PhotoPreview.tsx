'use client';

import React from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import styles from './PhotoUploadForm.module.css';

interface PhotoPreviewProps {
    imageUrl: string;
    onRemove: () => void;
}

export default function PhotoPreview({ imageUrl, onRemove }: PhotoPreviewProps) {
    return (
        <div className={styles.previewContainer}>
            <div className={styles.previewImageWrapper}>
                <Image 
                    src={imageUrl} 
                    alt="Preview" 
                    fill 
                    className={styles.previewImage} 
                    unoptimized 
                    style={{ objectFit: 'contain' }} 
                />
            </div>
            <button className={styles.removeBtn} onClick={onRemove}>
                <X size={20} />
            </button>
        </div>
    );
}
