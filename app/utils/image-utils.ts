async function resizeAndExportJpeg(
    source: HTMLImageElement | ImageBitmap,
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number,
    quality: number,
    fileName: string,
): Promise<File> {
    let w = width;
    let h = height;

    if (w > h) {
        if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
    } else {
        if (h > maxHeight) { w = Math.round((w * maxHeight) / h); h = maxHeight; }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);

    return new Promise<File>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() }));
            else reject(new Error('Canvas toBlob failed'));
        }, 'image/jpeg', quality);
    });
}

export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File | Blob> {
    const fileName = file.name.toLowerCase();
    const isHEIC = fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
                   file.type === 'image/heic' || file.type === 'image/heif';

    if (isHEIC) {
        // Use the browser's native HEIC decoder (works on Safari/WebKit — the same platform iPhones use)
        try {
            const bitmap = await createImageBitmap(file);
            const outName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
            const result = await resizeAndExportJpeg(bitmap, bitmap.width, bitmap.height, maxWidth, maxHeight, quality, outName);
            bitmap.close();
            return result;
        } catch {
            throw new Error(
                'HEIC formatni o\'qib bo\'lmadi. Iltimos, Safari brauzeridan foydalaning ' +
                'yoki iPhone\'da: Fotolar → Ulashish → Variantlar → Ko\'proq moslik (JPG). ' +
                '(HEIC not supported in this browser. Open in Safari or export as JPG from iPhone Photos.)'
            );
        }
    }

    if (!file.type.startsWith('image/')) return file;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = async () => {
                try {
                    resolve(await resizeAndExportJpeg(img, img.width, img.height, maxWidth, maxHeight, quality, file.name));
                } catch {
                    resolve(file);
                }
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

    if (!isHEIC && fileType !== '' && !fileType.startsWith('image/')) {
        return { valid: false, error: 'Faqat rasm yuklash mumkin (Only images are allowed)' };
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
        return { valid: false, error: `Rasm hajmi ${maxSizeMB}MB dan oshmasligi kerak (Image size must be less than ${maxSizeMB}MB)` };
    }

    return { valid: true };
}
