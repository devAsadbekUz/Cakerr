import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared utility to upload Base64 images to Supabase Storage.
 * Supports various Base64 formats and automatically detects mime-type and extension.
 * 
 * @param supabase The Supabase client (should be Service Role for server-side)
 * @param base64String The raw Base64 string (data:image/...)
 * @param userId An identifier for the folder structure (e.g., customerId or staffId)
 * @param prefix A prefix for the filename (e.g., 'photo', 'drawing')
 * @returns The public URL of the uploaded image, or null on failure
 */
export async function uploadBase64Image(
    supabase: SupabaseClient,
    base64String: string,
    userId: string,
    prefix: string
): Promise<string | null> {
    const defaultExt = 'png';
    const cleanUserId = userId.replace(/[^a-zA-Z0-9-]/g, '_'); // Sanitize for folder name
    
    try {
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            console.error('[Storage Utils] Invalid base64 format received');
            return null;
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = mimeType.split('/')[1] || defaultExt;
        const fileName = `${cleanUserId}/${prefix}_${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from('custom-cakes')
            .upload(fileName, buffer, { 
                contentType: mimeType, 
                upsert: false,
                cacheControl: '3600'
            });

        if (error) {
            console.error(`[Storage Utils] Upload Error Bucket: custom-cakes, File: ${fileName}`, error);
            return null;
        }

        const { data } = supabase.storage.from('custom-cakes').getPublicUrl(fileName);
        return data.publicUrl;
    } catch (err) {
        console.error('[Storage Utils] Fatal error during upload processing:', err);
        return null;
    }
}
