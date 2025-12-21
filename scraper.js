import axios from 'axios';
import * as cheerio from 'cheerio';

// --- Helper Utilities ---
async function fetchHTML(url) {
    try {
        const { data } = await axios.get(url);
        return cheerio.load(data);
    } catch (e) {
        console.error(`Error fetching ${url}:`, e.message);
        return null;
    }
}

// --- Specific Scrapers ---

export async function scrapeSarkariResult() {
    const URL = 'https://sarkariresult.com.cm/';
    const $ = await fetchHTML(URL);
    if (!$) return null;

    const scrapedData = { results: [], admitCards: [], latestJobs: [] };
    const categories = [
        { title: 'Result', key: 'results' },
        { title: 'Admit Card', key: 'admitCards' },
        { title: 'Latest Job', key: 'latestJobs' }
    ];

    categories.forEach(category => {
        // Robust header finding
        const possibleHeaders = $(`h1, h2, h3, h4, p, div`).filter((i, el) => {
            const text = $(el).text().trim();
            return text.includes(category.title) && text.length < 50; 
        });

        possibleHeaders.each((i, headerEl) => {
            let nextEl = $(headerEl).next();
            // Look ahead for a list
            for(let j=0; j<5; j++) {
                if (nextEl.length && (nextEl.is('ul') || nextEl.find('ul').length > 0)) {
                    let list = nextEl.is('ul') ? nextEl : nextEl.find('ul').first();
                    list.find('a').each((k, link) => {
                        const text = $(link).text().trim();
                        const url = $(link).attr('href');
                        if (text && url && url.startsWith('http')) {
                             // Dedup
                             if (!scrapedData[category.key].some(item => item.url === url)) {
                                 scrapedData[category.key].push({ text, url, source: 'SarkariResult' });
                             }
                        }
                    });
                    break; 
                }
                nextEl = nextEl.next();
            }
        });
    });
    return scrapedData;
}



