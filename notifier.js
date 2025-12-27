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
    // Map category to prefix
    let prefix = 'UPDATE';
    if (category === 'Admit Card') prefix = 'ADMITCARD';
    else if (category === 'Result') prefix = 'RESULT';
    else if (category === 'Answer Key') prefix = 'ANSWERKEY';
    else if (category === 'Latest Job') prefix = 'FORM';

    // Construct message: PREFIX URL
    const message = `${prefix} ${item.url}`;

    if (!bot || !chatId) {
        console.log(`[Mock Notification] ${message}`);
        return;
    }


    
    try {
        await bot.sendMessage(chatId, message);
        console.log(`Sent notification for: ${item.text}`);
    } catch (error) {
        console.error('Failed to send Telegram notification:', error.message);
    }
}
