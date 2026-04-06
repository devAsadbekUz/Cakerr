'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
    className?: string;
}

export default function BackButton({ className }: BackButtonProps) {
    const router = useRouter();
    return (
        <button
            onClick={() => router.back()}
            className={className}
            aria-label="Orqaga"
        >
            <ChevronLeft size={24} />
        </button>
    );
}
