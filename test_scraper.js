import { scrapeSite } from './scraper.js';

async function test() {
    console.log("Testing scraper...");
    const data = await scrapeSite();
    
    if (data) {
        console.log("Scrape success!");
        console.log(`Results found: ${data.results.length}`);
        if(data.results.length > 0) console.log("Sample Result:", data.results[0]);
        
        console.log(`Admit Cards found: ${data.admitCards.length}`);
        if(data.admitCards.length > 0) console.log("Sample Admit Card:", data.admitCards[0]);
        
        console.log(`Latest Jobs found: ${data.latestJobs.length}`);
        if(data.latestJobs.length > 0) console.log("Sample Job:", data.latestJobs[0]);
    } else {
        console.log("Scrape failed.");
    }
}

test();
