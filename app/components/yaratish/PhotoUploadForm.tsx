'use client';

import React, { useRef, useState } from 'react';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import { useCartActions } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import styles from './PhotoUploadForm.module.css';
import { useLanguage } from '@/app/context/LanguageContext';

// Sub-components (Architecture Decomposition)
import PhotoDropZone from './PhotoDropZone';
import PhotoPreview from './PhotoPreview';

interface PhotoUploadFormProps {
    onItemComplete?: (item: any) => void;
    onClose?: () => void;
}

// Placeholder starting price for photo-based custom cakes.
// Final price is agreed with the customer and updated by admin before confirmation.
// Price is 0 — the real agreed price is set by admin after calling the customer.
const PHOTO_CAKE_BASE_PRICE = 0;

export default function PhotoUploadForm({ onItemComplete, onClose }: PhotoUploadFormProps) {
    const {
        uploadedImage,
        setUploadedImage,
        uploadComment,
        setUploadComment,
        setMode
    } = useCustomCake();
    
    const { addItem } = useCartActions();
    const router = useRouter();
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert(t('pleaseUploadImage'));
            return;
        }

        // 10MB Limit for stability
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            alert(t('imageTooLarge'));
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            setSelectedFile(file);
            processFile(file);
        }
    };

    const handleRemoveImage = () => {
        setUploadedImage(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAddToCart = async () => {
        // Early Return Pattern (Architecture Skill)
        if (!uploadedImage || !selectedFile) return;

        setIsUploading(true);
        try {
            const file = selectedFile;
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to Supabase Storage
            const { createClient } = await import('@/app/utils/supabase/client');
            const supabase = createClient();
            
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('custom-cakes')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase
                .storage
                .from('custom-cakes')
                .getPublicUrl(filePath);

            const item = {
                id: '00000000-0000-0000-0000-000000000000',
                name: t('photoCakeName'),
                price: PHOTO_CAKE_BASE_PRICE,
                image: publicUrl,
                portion: t('asAgreed'),
                flavor: t('customerChoice'),
                quantity: 1,
                customNote: uploadComment,
                configuration: {
                    mode: 'upload',
                    uploaded_photo_url: publicUrl,
                    custom_note: uploadComment,
                    pricing_type: 'hybrid',
                    estimated_total: PHOTO_CAKE_BASE_PRICE
                }
            };

            if (onItemComplete) {
                onItemComplete(item);
                return;
            }

            await addItem(item);
            router.push('/savat');
        } catch (err: any) {
            console.error('[PhotoUploadForm] Critical failure:', err);
            alert(t('uploadError'));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={styles.container}>
            <button className={styles.backLink} onClick={() => onClose ? onClose() : setMode(null)}>
                <ChevronLeft size={20} /> {t('back')}
            </button>

            <h2 className={styles.title}>{t('uploadPhoto')}</h2>
            <p className={styles.description}>
                {t('uploadPhotoFormDesc')}
            </p>

            <div className={styles.uploadSection}>
                {!uploadedImage ? (
                    <PhotoDropZone 
                        isDragging={isDragging}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        fileInputRef={fileInputRef}
                        onFileChange={handleFileChange}
                    />
                ) : (
                    <PhotoPreview 
                        imageUrl={uploadedImage} 
                        onRemove={handleRemoveImage} 
                    />
                )}
            </div>

            <div className={styles.commentSection}>
                <label htmlFor="comment">{t('additionalNote')}</label>
                <textarea
                    id="comment"
                    value={uploadComment}
                    onChange={(e) => setUploadComment(e.target.value)}
                    placeholder={t('photoCommentPlaceholder')}
                    className={styles.textarea}
                    rows={4}
                />
            </div>

            <div className={styles.footer}>
                <button
                    className={styles.addToCartBtn}
                    disabled={!uploadedImage || isUploading}
                    onClick={handleAddToCart}
                >
                    {isUploading ? t('loading') : t('addToCart')}
                </button>
            </div>
        </div>
    );
}
