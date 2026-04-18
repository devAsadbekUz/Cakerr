'use client';

import { useState, useRef } from 'react';
import { uploadImageAction } from '@/app/actions/image-actions';
import { compressImage, validateImage } from '@/app/utils/image-utils';
import Image from 'next/image';
import { Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    bucket?: string;
}

export default function ImageUpload({ value, onChange, bucket = 'images' }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;

            // 1. Validation
            const validation = validateImage(file);
            if (!validation.valid) {
                 alert(validation.error);
                 return;
            }

            setUploading(true);

            // 2. Compression
            const optimizedFile = await compressImage(file);

            // 3. Server-side upload via action (bypasses RLS)
            const formData = new FormData();
            formData.append('file', optimizedFile);
            formData.append('bucket', bucket);

            const result = await uploadImageAction(formData);

            if (result.error) throw new Error(result.error);
            if (result.url) {
                onChange(result.url);
            }
        } catch (error: any) {
            console.error('[ImageUpload] Error:', error);
            alert('Yuklashda xatolik (Upload error): ' + error.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div style={{ width: '100%' }}>
            {value && value.startsWith('http') ? (
                <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    <Image src={value} alt="Uploaded" fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 33vw" />
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        style={{
                            position: 'absolute', top: '8px', right: '8px',
                            background: 'white', border: 'none', borderRadius: '50%',
                            padding: '6px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        width: '100%', height: '120px',
                        border: '2px dashed #E5E7EB', borderRadius: '12px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: uploading ? 'not-allowed' : 'pointer', background: '#F9FAFB',
                        transition: 'all 0.2s', gap: '8px'
                    }}
                >
                    {uploading ? (
                        <Loader2 className="animate-spin" color="#9CA3AF" />
                    ) : (
                        <>
                            <Upload color="#9CA3AF" />
                            <span style={{ fontSize: '14px', color: '#6B7280' }}>Rasm yuklash</span>
                        </>
                    )}
                </div>
            )}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept="image/*"
                style={{ display: 'none' }}
                disabled={uploading}
            />
        </div>
    );
}
