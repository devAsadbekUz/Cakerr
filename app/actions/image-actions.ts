'use server';

import { serviceClient } from '@/app/utils/supabase/service';
import { isAdminVerified } from '@/app/utils/admin-auth';

/**
 * Server action to upload an image to Supabase Storage using the Service Role.
 * This bypasses RLS while still verifying that the requester is a verified admin/staff member.
 */
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
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        console.log(`[Upload Action] Starting upload for ${file.name} to ${bucket}. Size: ${file.size} bytes`);

        // Convert File to ArrayBuffer for Supabase upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data, error: uploadError } = await serviceClient.storage
            .from(bucket)
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            console.error('[Upload Action] Supabase error:', uploadError);
            throw new Error(`Supabase Storage Error: ${uploadError.message}`);
        }

        console.log(`[Upload Action] Successfully uploaded: ${filePath}`);

        // Generate public URL
        const { data: { publicUrl } } = serviceClient.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return { url: publicUrl, path: filePath };
    } catch (error: any) {
        console.error('[Upload Action] Exception:', error);
        // Ensure we always return an error message that can be parsed
        return { error: error.message || 'An unknown error occurred during upload' };
    }
}
