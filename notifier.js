import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot = null;

if (token) {
    bot = new TelegramBot(token, { polling: false });
} else {
    console.warn("TELEGRAM_BOT_TOKEN not found in .env. Notifications will be disabled.");
}

export async function sendNotification(item, category) {
    if (!bot || !chatId) {
        // User requested ONLY the link
        const message = item.url;
        console.log(`[Mock Notification] ${message}`);
        return;
    }

    // User requested ONLY the link
    const message = item.url;
    
    try {
        await bot.sendMessage(chatId, message);
        console.log(`Sent notification for: ${item.text}`);
    } catch (error) {
        console.error('Failed to send Telegram notification:', error.message);
    }
}
