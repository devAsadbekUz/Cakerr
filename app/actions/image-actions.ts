'use server';

import { serviceClient } from '@/app/utils/supabase/service';
import { isAdminVerified } from '@/app/utils/admin-auth';
import sharp from 'sharp';

export async function uploadImageAction(formData: FormData) {
    if (!await isAdminVerified()) {
        throw new Error('Unauthorized: Staff access required');
    }

    const file = formData.get('file') as File;
    const bucket = (formData.get('bucket') as string) || 'images';

    if (!file) {
        throw new Error('No file provided');
    }

    try {
        const originalName = file.name.toLowerCase();
        const isHEIC = originalName.endsWith('.heic') || originalName.endsWith('.heif') ||
                       file.type === 'image/heic' || file.type === 'image/heif';

        let buffer: Buffer = Buffer.from(await file.arrayBuffer());
        let contentType = file.type || 'image/jpeg';
        let fileExt: string;

        if (isHEIC) {
            // Convert HEIC to JPEG server-side using sharp (native libheif — supports all variants)
            buffer = await sharp(buffer)
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer();
            contentType = 'image/jpeg';
            fileExt = 'jpg';
        } else {
            const mimeToExt: Record<string, string> = {
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/webp': 'webp',
                'image/gif': 'gif',
                'image/avif': 'avif',
            };
            fileExt = mimeToExt[file.type] || file.name.split('.').pop() || 'jpg';
        }

        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        console.log(`[Upload Action] Uploading ${file.name} → ${fileName} (${contentType}), ${buffer.length} bytes`);

        const { error: uploadError } = await serviceClient.storage
            .from(bucket)
            .upload(fileName, buffer, {
                contentType,
                upsert: false,
            });

        if (uploadError) {
            console.error('[Upload Action] Supabase error:', uploadError);
            throw new Error(`Supabase Storage Error: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = serviceClient.storage
            .from(bucket)
            .getPublicUrl(fileName);

        console.log(`[Upload Action] Done: ${publicUrl}`);
        return { url: publicUrl, path: fileName };
    } catch (error: any) {
        console.error('[Upload Action] Exception:', error);
        return { error: error.message || 'An unknown error occurred during upload' };
    }
}
