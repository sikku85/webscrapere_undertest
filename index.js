
import express from 'express';
import { scrapeSarkariResult } from './scraper.js';
import { initDB, loadState, saveNewLinks, filterNewItems, updateState } from './storage.js';
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

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

app.get('/', (req, res) => {
    res.json({
        status: 'active',
        message: 'SarkariResult Scraper Backend is running.',
        stats
    });
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
}

// Schedule - Runs every minute
cron.schedule('* * * * *', () => {
    run();
});

