export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File | Blob> {
    let fileToCompress = file;

    // Auto-convert HEIC/HEIF to JPEG (iPhone format)
    const fileName = file.name.toLowerCase();
    const isHEIC = fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
                   file.type === 'image/heic' || file.type === 'image/heif';

    if (isHEIC) {
        try {
            const heic2any = (await import('heic2any')).default;
            const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
            const blob = Array.isArray(converted) ? converted[0] : converted;
            const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
            fileToCompress = new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
        } catch (err) {
            console.error('[compressImage] HEIC conversion failed:', err);
            return file;
        }
    }

    if (!fileToCompress.type.startsWith('image/')) {
        return fileToCompress;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(fileToCompress);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return resolve(fileToCompress);
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], fileToCompress.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            resolve(fileToCompress);
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => resolve(fileToCompress);
        };
        reader.onerror = () => resolve(fileToCompress);
    });
}

export function validateImage(file: File, maxSizeMB = 10): { valid: boolean; error?: string } {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    // Allow HEIC/HEIF through — they get auto-converted in compressImage
    const isHEIC = fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
                   fileType === 'image/heic' || fileType === 'image/heif';

    // Reject non-image files (but allow empty type since HEIC sometimes reports as such)
    if (!isHEIC && fileType !== '' && !fileType.startsWith('image/')) {
        return { valid: false, error: 'Faqat rasm yuklash mumkin (Only images are allowed)' };
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
        return { valid: false, error: `Rasm hajmi ${maxSizeMB}MB dan oshmasligi kerak (Image size must be less than ${maxSizeMB}MB)` };
    }

    return { valid: true };
}
