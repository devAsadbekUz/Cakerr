import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.TELEGRAM_BOT_TOKEN;
const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;

async function check() {
    console.log('Checking webhook for token:', token ? `${token.slice(0,6)}...` : 'MISSING');
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

check();
