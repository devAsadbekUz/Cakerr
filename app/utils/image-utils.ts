export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File | Blob> {
    const fileName = file.name.toLowerCase();
    const isHEIC = fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
                   file.type === 'image/heic' || file.type === 'image/heif';

    // HEIC files are converted server-side by sharp — skip client-side processing
    if (isHEIC) {
        return file;
    }

    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
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
                if (!ctx) return resolve(file);

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            }));
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
}

export function validateImage(file: File, maxSizeMB = 12): { valid: boolean; error?: string } {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    const isHEIC = fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
                   fileType === 'image/heic' || fileType === 'image/heif';

    // Reject non-image files (allow HEIC and empty-type files through)
    if (!isHEIC && fileType !== '' && !fileType.startsWith('image/')) {
        return { valid: false, error: 'Faqat rasm yuklash mumkin (Only images are allowed)' };
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
        return { valid: false, error: `Rasm hajmi ${maxSizeMB}MB dan oshmasligi kerak (Image size must be less than ${maxSizeMB}MB)` };
    }

    return { valid: true };
}
