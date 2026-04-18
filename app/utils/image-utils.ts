/**
 * Client-side utility to compress and resize images before upload.
 * This helps avoid hitting server body size limits and makes uploads faster.
 */
export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File | Blob> {
    // Only compress images
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions while maintaining aspect ratio
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
                    return resolve(file); // Fallback to original
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            // Create a new file from the blob to preserve filename if possible
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
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

/**
 * Validates file size and type
 */
export function validateImage(file: File, maxSizeMB = 10): { valid: boolean; error?: string } {
    if (!file.type.startsWith('image/')) {
        return { valid: false, error: 'Faqat rasm yuklash mumkin (Only images are allowed)' };
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
        return { valid: false, error: `Rasm hajmi ${maxSizeMB}MB dan oshmasligi kerak (Image size must be less than ${maxSizeMB}MB)` };
    }

    return { valid: true };
}
