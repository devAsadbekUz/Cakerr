'use client';

import { useState, useRef, useEffect } from 'react';
import { uploadImageAction } from '@/app/actions/image-actions';
import { compressImage, validateImage } from '@/app/utils/image-utils';
import Image from 'next/image';
import { Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    bucket?: string;
}

export default function ImageUpload({ value, onChange, bucket = 'images' }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [version, setVersion] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const retryCountRef = useRef(0);

    // Reset error and retry count whenever the image URL changes
    useEffect(() => {
        setHasError(false);
        retryCountRef.current = 0;
    }, [value]);

    const handleImageError = () => {
        if (retryCountRef.current < 2) {
            retryCountRef.current++;
            setTimeout(() => setVersion(v => v + 1), 1500);
        } else {
            setHasError(true);
        }
    };

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
            setHasError(false);

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
                setVersion(v => v + 1); // Reset version on new upload
            }
        } catch (error: any) {
            console.error('[ImageUpload] Error:', error);
            alert('Yuklashda xatolik (Upload error): ' + error.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleReload = (e: React.MouseEvent) => {
        e.stopPropagation();
        setHasError(false);
        retryCountRef.current = 0;
        setVersion(v => v + 1);
    };

    const displayUrl = value ? `${value}${value.includes('?') ? '&' : '?'}v=${version}` : '';

    return (
        <div style={{ width: '100%' }}>
            {value && value.startsWith('http') ? (
                <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                    <Image
                        src={displayUrl}
                        alt="Uploaded"
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        onError={handleImageError}
                        onLoad={() => setHasError(false)}
                    />
                    
                    {hasError && (
                        <div style={{ 
                            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
                            alignItems: 'center', justifyContent: 'center', background: '#FEF2F2', 
                            color: '#991B1B', gap: '8px', zIndex: 5 
                        }}>
                             <span style={{ fontSize: '12px', fontWeight: 600 }}>Format xatosi (Bad format)</span>
                             <button 
                                type="button" 
                                onClick={handleReload}
                                style={{ 
                                    padding: '6px 12px', background: 'white', border: '1px solid #FECACA', 
                                    borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                             >
                                Qayta yuklash (Reload)
                             </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => { onChange(''); setHasError(false); }}
                        style={{
                            position: 'absolute', top: '8px', right: '8px',
                            background: 'white', border: 'none', borderRadius: '50%',
                            padding: '6px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            zIndex: 10
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
