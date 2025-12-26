'use client';

import React, { useRef, useState } from 'react';
import { useCustomCake } from '@/app/context/CustomCakeContext';
import { useCart } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';
import { Upload, X, ChevronLeft } from 'lucide-react';
import styles from './PhotoUploadForm.module.css';

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Iltimos, rasm yuklang (Please upload an image)');
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
            processFile(file);
        }
    };

    const handleRemoveImage = () => {
        setUploadedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAddToCart = () => {
        if (!uploadedImage) return;

        addItem({
            id: `custom-upload-${Date.now()}`,
            name: 'Rasmli Tort (Custom)',
            price: 350000,
            image: uploadedImage, // Using the uploaded image as thumbnail
            portion: 'Kelishilgan holda',
            flavor: 'Mijoz tanlovi',
            quantity: 1,
            // We might want to pass the comment somewhere, for now context holds it
            // Ideally cart item should handle custom attributes
            customNote: uploadComment
        });

        router.push('/savat');
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
                    <div
                        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            hidden
                        />
                        <div className={styles.uploadIcon}>
                            <Upload size={32} />
                        </div>
                        <p>Rasm yuklash uchun bosing yoki shu yerga tashlang</p>
                    </div>
                ) : (
                    <div className={styles.previewContainer}>
                        <img src={uploadedImage} alt="Preview" className={styles.previewImage} />
                        <button className={styles.removeBtn} onClick={handleRemoveImage}>
                            <X size={20} />
                        </button>
                    </div>
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
                    disabled={!uploadedImage}
                    onClick={handleAddToCart}
                >
                    Savatga qo'shish
                </button>
            </div>
        </div>
    );
}
