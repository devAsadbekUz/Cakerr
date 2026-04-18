'use server';

import { serviceClient } from '@/app/utils/supabase/service';
import { isAdminVerified } from '@/app/utils/admin-auth';

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
        const mimeToExt: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif',
            'image/avif': 'avif',
        };
        const fileExt = mimeToExt[file.type] || file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        console.log(`[Upload Action] ${file.name} → ${fileName} (${file.type}), ${file.size} bytes`);

        const buffer = Buffer.from(await file.arrayBuffer());

        const { error: uploadError } = await serviceClient.storage
            .from(bucket)
            .upload(fileName, buffer, { contentType: file.type, upsert: false });

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
