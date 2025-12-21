import cron from 'node-cron';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeSarkariResult } from './scraper.js';
import { initDB, loadState, saveNewLinks, filterNewItems, updateState } from './storage.js';
import { sendNotification } from './notifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory stats for dashboard
let stats = {
    totalLinks: 0,
    lastRunDuration: 0,
    telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
    dbConnected: false,
    logs: [] 
};

function log(message) {
    const entry = { timestamp: Date.now(), message };
    console.log(message);
    stats.logs.unshift(entry);
    if (stats.logs.length > 50) stats.logs.pop();
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/stats', async (req, res) => {
    // Refresh stats
    try {
        const state = await loadState();
        stats.totalLinks = state.seenLinks.length;
    } catch(e) {}
    res.json(stats);
});

app.get('/api/trigger', async (req, res) => {
    log('Manual trigger received');
    await run();
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

async function run() {
    log('Running scraper job...');
    const start = Date.now();
    
    // Ensure DB connected
    await initDB();
    stats.dbConnected = !!process.env.MONGODB_URI;

    let state = await loadState();
    const isFirstRun = state.seenLinks.length === 0;

    // Run scraper
    const data = await scrapeSarkariResult();

    if (!data || ((!data.results.length) && (!data.latestJobs.length))) {
        log('Scrape warning: No data found.');
        stats.lastRunDuration = Date.now() - start;
        return;
    }

    const categories = [
        { key: 'results', label: 'Result' },
        { key: 'admitCards', label: 'Admit Card' },
        { key: 'latestJobs', label: 'Latest Job' }
    ];

    let newLinksFound = 0;

    for (const cat of categories) {
        const items = data[cat.key];
        const newItems = filterNewItems(state, items);

        if (newItems.length > 0) {
            newLinksFound += newItems.length;
            
            if (isFirstRun) {
                log(`First run (DB empty): Found ${newItems.length} items in ${cat.label} (Skipping alerts)`);
                // Save to DB so next time they are "seen"
                await saveNewLinks(newItems, cat.label);
                updateState(state, newItems);
            } else {
                for (const item of newItems) {
                    await sendNotification(item, cat.label);
                    log(`New Item: ${item.text}`);
                }
                // Save to DB
                await saveNewLinks(newItems, cat.label);
                updateState(state, newItems);
            }
        }
    }

    if (newLinksFound > 0) {
        log(`Synced ${newLinksFound} new items to MongoDB.`);
    } else {
        log('No new items found.');
    }
    
    stats.lastRunDuration = Date.now() - start;
}

// Schedule
log('Starting Sarkari Scraper Service (MongoDB Mode)...');
initDB().then(() => run());

cron.schedule('* * * * *', () => {
    run();
});


