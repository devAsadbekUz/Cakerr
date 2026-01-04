'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    bucket?: string;
}

export default function ImageUpload({ value, onChange, bucket = 'images' }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
            onChange(data.publicUrl);
        } catch (error: any) {
            alert('Upload error: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ width: '100%' }}>
            {value && value.startsWith('http') ? (
                <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    <img src={value} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
