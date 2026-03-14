const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createBucket() {
    const { data, error } = await supabase.storage.createBucket('custom-cakes', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
        fileSizeLimit: 10485760 // 10MB
    });

    if (error) {
        console.error('Error creating bucket:', error);
    } else {
        console.log('Bucket created successfully:', data);
    }
}

createBucket();
