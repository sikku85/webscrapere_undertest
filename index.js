
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { scrapeSarkariResult } from './scraper.js';
import { initDB, loadState, saveNewLinks, filterNewItems, updateState, getDailyStats } from './storage.js';
import { sendNotification } from './notifier.js';
import cron from 'node-cron';

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory stats for basic health check
let stats = {
    lastRun: null,
    lastRunDuration: 0,
    dbConnected: false,
    itemsFoundLastRun: 0
};

const logs = [];
function log(message) {
    const msg = `[${new Date().toISOString()}] ${message}`;
    console.log(msg);
    logs.unshift(msg); // Add to beginning
    if (logs.length > 50) logs.pop(); // Keep last 50
}

app.use(express.static(path.join(__dirname, 'public')));

let cachedDailyStats = null;
let lastCacheTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

app.get('/api/status', async (req, res) => {
    // Check dynamic DB status
    const isConnected = mongoose.connection.readyState === 1;
    stats.dbConnected = isConnected;

    // Cache Daily Stats
    if (!cachedDailyStats || (Date.now() - lastCacheTime > CACHE_DURATION)) {
        cachedDailyStats = await getDailyStats();
        lastCacheTime = Date.now();
    }

    res.json({
        status: 'active',
        message: 'SarkariResult Scraper Backend is running.',
        stats,
        dailyStats: cachedDailyStats,
        logs
    });
});

app.get('/api/trigger', async (req, res) => {
    log('Vercel Cron trigger received');
    try {
        await run();
        res.json({ success: true, message: 'Scraper run completed' });
    } catch (error) {
        console.error('Scraper run failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Vercel requires exporting the app
export default app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        
        // Start Cron Job
        log('Starting cron job: */1 * * * *');
        cron.schedule('*/1 * * * *', run);
    });
}

let isProcessing = false;

async function run() {
    if (isProcessing) {
        log('Skipping run: Previous job still processing.');
        return;
    }
    isProcessing = true;
    
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
        stats.lastRun = new Date();
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
                    let shouldNotify = true;

                    // Filter logic for Latest Jobs
                    if (cat.key === 'latestJobs') {
                        const lowerText = (item.text || '').toLowerCase();
                        if (lowerText.includes('last date')) {
                            shouldNotify = false;
                            log(`Skipping notification for: ${item.text}`);
                        }
                    }

                    if (shouldNotify) {
                        await sendNotification(item, cat.label);
                        log(`New Item: ${item.text}`);
                    }
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
    
    stats.itemsFoundLastRun = newLinksFound;
    stats.lastRunDuration = Date.now() - start;
    stats.lastRun = new Date();
    isProcessing = false;
}

