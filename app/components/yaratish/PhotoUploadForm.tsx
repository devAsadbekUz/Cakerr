'use client';

import React, { useRef, useState } from 'react';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import { useCart } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import styles from './PhotoUploadForm.module.css';

// Sub-components (Architecture Decomposition)
import PhotoDropZone from './PhotoDropZone';
import PhotoPreview from './PhotoPreview';

export default function PhotoUploadForm() {
    const {
        uploadedImage,
        setUploadedImage,
        uploadComment,
        setUploadComment,
        setMode
    } = useCustomCake();
    
    const { addItem } = useCart();
    const router = useRouter();
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
            alert('Iltimos, rasm yuklang (Please upload an image)');
            return;
        }

        // 10MB Limit for stability
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            alert('Rasm hajmi juda katta (maksimal 10MB). Iltimos, kichikroq rasm tanlang.');
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

            // 3. Add to Cart with the URL and the Placeholder UUID
            await addItem({
                id: '00000000-0000-0000-0000-000000000000', // FIXED UUID for Custom Cakes
                name: 'Maxsus tort (Rasm asosida)',
                price: 350000,
                image: publicUrl, 
                portion: 'Kelishilgan holda',
                flavor: 'Mijoz tanlovi',
                quantity: 1,
                customNote: uploadComment,
                configuration: {
                    mode: 'upload',
                    uploaded_photo_url: publicUrl,
                    custom_note: uploadComment,
                    pricing_type: 'hybrid',
                    estimated_total: 350000
                }
            });

            router.push('/savat');
        } catch (err: any) {
            console.error('[PhotoUploadForm] Critical failure:', err);
            alert('Rasm yuklashda xatolik yuz berdi. Iltimos qayta urinib ko\'ring.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={styles.container}>
            <button className={styles.backLink} onClick={() => setMode(null)}>
                <ChevronLeft size={20} /> Orqaga
            </button>

            <h2 className={styles.title}>Rasm yuklash</h2>
            <p className={styles.description}>
                O'zingizga yoqqan tort rasmini yuklang va bizga qanday tort kerakligini yozib qoldiring.
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
                <label htmlFor="comment">Qo'shimcha izoh</label>
                <textarea
                    id="comment"
                    value={uploadComment}
                    onChange={(e) => setUploadComment(e.target.value)}
                    placeholder="Masalan: Shokaladli biskvit, ustiga tabrik so'zlari yoki tort o'lchamlari..."
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
                    {isUploading ? 'Yuklanmoqda...' : 'Savatga qo\'shish'}
                </button>
            </div>
        </div>
    );
}
