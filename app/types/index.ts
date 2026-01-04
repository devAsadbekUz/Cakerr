export interface Product {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;

    // Price
    base_price: number;
    price: number; // Computed or Display price

    // Image
    image_url: string; // DB field
    image: string; // UI mapped field (to support legacy components)

    // Category
    category_id: string; // FK
    category: string; // Label (Joined)
    categoryId?: string; // UI mapped field (deprecated, use category_id)

    // Status
    is_available: boolean;
    is_ready: boolean;

    // Variants
    variants: Variant[];

    // Details (Legacy/Future)
    details?: ProductDetails;
}

export interface Variant {
    id?: string; // Optional as it might be part of a jsonb array without explicit IDs
    value: string; // Critical: used for selection logic (e.g., 'small', 'medium')
    label: string; // Display text
    price: number;
}

export interface ProductDetails {
    shapes?: string[];
    flavors?: string[];
    coating?: string[];
    decorations?: string[];
    innerCoating?: string[];
}

export interface Category {
    id: string;
    label: string;
    icon: string;
    image_url?: string;
}

export interface UserAddress {
    id: string;
    user_id: string;
    label: string;
    address_text: string;
    apartment?: string;
    floor?: string;
    entrance?: string;
    lat?: number;
    lng?: number;
    is_default: boolean;
}

export interface UserProfile {
    id: string;
    full_name: string | null;
    phone_number: string | null;
    role: 'customer' | 'admin' | 'baker';
    avatar_url: string | null;
}
