import { scrapeResultBharat, scrapeSarkariResult } from './scraper.js';

async function test() {
    console.log("Testing SarkariResult...");
    try {
        const d1 = await scrapeSarkariResult();
        if(d1) {
             console.log(`SarkariResult: ${d1.results.length} results, ${d1.latestJobs.length} jobs.`);
        } else {
             console.log("SarkariResult: Failed (Returned null)");
        }

        console.log("\nTesting ResultBharat...");
        const d2 = await scrapeResultBharat();
        if(d2) {
            console.log(`ResultBharat: ${d2.results.length} results, ${d2.latestJobs.length} jobs.`);
            if (d2.results.length > 0) {
                console.log("Sample ResultBharat Item:", d2.results[0]);
            }
        } else {
             console.log("ResultBharat: Failed (Returned null)");
        }
    } catch(e) {
        console.error("Test Error:", e);
    }
}

test();
