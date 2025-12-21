import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

console.log('Testing Telegram Connection...');

if (!token || !chatId) {
    console.error('Error: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing in .env');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

async function test() {
    try {
        const me = await bot.getMe();
        console.log(`Bot Identity: @${me.username} (ID: ${me.id})`);
        
        console.log(`Sending test message to ${chatId}...`);
        await bot.sendMessage(chatId, "✅ *Sarkari Scraper Connection Test*\n\nIf you see this, the bot is working!", { parse_mode: 'Markdown' });
        
        console.log('Message sent successfully!');
    } catch (error) {
        console.error('Telegrarm Error:', error.message);
        if (error.response) {
            console.error('Response Code:', error.response.statusCode);
            console.error('Response Body:', error.response.body);
        }
    }
}

test();
