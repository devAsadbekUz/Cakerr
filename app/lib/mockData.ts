export const CATEGORIES = [
    { id: 'birthday', label: "Tug'ilgan kun", icon: '/icons/birthday.png' },
    { id: 'wedding', label: "To'y", icon: '/icons/wedding.png' },
    { id: 'anniversary', label: "Yilliklar", icon: '/icons/anniversary.png' },
    { id: 'kids', label: "Bolajon", icon: '/icons/kids.png' },
    { id: 'joy', label: "Shodlik", icon: '/icons/joy.png' },
    { id: 'love', label: "Muhabbat", icon: '/icons/love.png' },
    { id: 'custom', label: "Maxsus tortlar", icon: '/icons/custom.png' },
];

export interface Product {
    id: string;
    title: string;
    subtitle?: string;
    price: number;
    image: string;
    categoryId: string;
    rating: number;
    reviews: number;
    description?: string;
    details?: {
        flavors: string[];
        coating: string[];
        innerCoating: string[];
        decorations: string[];
        shapes?: string[];
    };
    variants?: { id: string; value: string; label: string; price: number }[];
}

export const MOCK_PRODUCTS: Product[] = [
    // Tug'ilgan kun (Birthday)
    {
        id: 'b1',
        title: 'Rainbow Splash',
        subtitle: 'Klassik kamalak rangli tort',
        price: 250000,
        image: 'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?auto=format&fit=crop&w=800&q=80',
        categoryId: 'birthday',
        rating: 4.8,
        reviews: 124,
        description: 'Bu tayyor tort. Siz faqat porsiya miqdorini tanlaysiz va buyurtma berasiz!',
        details: {
            shapes: ['Dumaloq'],
            flavors: ['Vanilli'],
            coating: ['Cream Cheese'],
            innerCoating: ['Meva'],
            decorations: [' sprinkles', 'Kamalak']
        },
        variants: [
            { id: 'v1', value: '2', label: 'kishilik', price: 250000 },
            { id: 'v2', value: '4', label: 'kishilik', price: 450000 },
            { id: 'v3', value: '6', label: 'kishilik', price: 650000 },
        ]
    },
    {
        id: 'b2',
        title: 'Classic Chocolate Birthday',
        subtitle: 'Boy shokoladli tort',
        price: 220000,
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
        categoryId: 'birthday',
        rating: 4.9,
        reviews: 89,
        description: 'Shokoladni sevuvchilar uchun maxsus tayyorlangan tort.',
        details: {
            shapes: ['Shkvadrat'],
            flavors: ['Shokoladli'],
            coating: ['Ganash'],
            innerCoating: ['Shokolad krem'],
            decorations: ['Gilos', 'Oltin barg']
        },
        variants: [
            { id: 'v4', value: '2', label: 'kishilik', price: 220000 },
            { id: 'v5', value: '4', label: 'kishilik', price: 400000 },
        ]
    },

    // To'y (Wedding)
    {
        id: 'w1',
        title: 'Elegant White Tier',
        price: 850000,
        image: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=800&q=80',
        categoryId: 'wedding',
        rating: 5.0,
        reviews: 45
    },
    {
        id: 'w2',
        title: 'Floral Cascading',
        price: 920000,
        image: 'https://images.unsplash.com/photo-1546815670-6927d2c3df31?auto=format&fit=crop&w=800&q=80',
        categoryId: 'wedding',
        rating: 4.7,
        reviews: 32
    },

    // Yilliklar (Anniversary)
    {
        id: 'a1',
        title: 'Golden Jubilee',
        price: 450000,
        image: 'https://images.unsplash.com/photo-1562777717-dc698ae415bd?auto=format&fit=crop&w=800&q=80',
        categoryId: 'anniversary',
        rating: 4.8,
        reviews: 56
    },
    {
        id: 'a2',
        title: 'Heart Red Velvet',
        price: 380000,
        image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80',
        categoryId: 'anniversary',
        rating: 4.9,
        reviews: 78
    },

    // Bolajon (Kids)
    {
        id: 'k1',
        title: 'Dino Adventure',
        price: 300000,
        image: 'https://images.unsplash.com/photo-1559553156-2e97137af16f?auto=format&fit=crop&w=800&q=80',
        categoryId: 'kids',
        rating: 4.8,
        reviews: 112
    },
    {
        id: 'k2',
        title: 'Unicorn Dream',
        price: 320000,
        image: 'https://images.unsplash.com/photo-1517456209581-2c06637d7c65?auto=format&fit=crop&w=800&q=80',
        categoryId: 'kids',
        rating: 4.9,
        reviews: 156
    },

    // Shodlik (Joy)
    {
        id: 'j1',
        title: 'Berry Blast',
        price: 180000,
        image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
        categoryId: 'joy',
        rating: 4.7,
        reviews: 90
    },
    {
        id: 'j2',
        title: 'Citrus Zest',
        price: 195000,
        image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=80',
        categoryId: 'joy',
        rating: 4.6,
        reviews: 45
    },

    // Muhabbat (Love)
    {
        id: 'l1',
        title: 'Chocolate Strawberry Kiss',
        price: 280000,
        image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?auto=format&fit=crop&w=800&q=80',
        categoryId: 'love',
        rating: 4.9,
        reviews: 200
    },
    {
        id: 'l2',
        title: "Valentine's Rose",
        price: 350000,
        image: 'https://images.unsplash.com/photo-1588195538326-c5f1f9fa4a5f?auto=format&fit=crop&w=800&q=80',
        categoryId: 'love',
        rating: 5.0,
        reviews: 67
    }
];
