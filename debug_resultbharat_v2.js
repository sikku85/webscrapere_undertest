import axios from 'axios';
import * as cheerio from 'cheerio';

const URL = 'https://www.resultbharat.com/';

async function debug() {
    try {
        const { data } = await axios.get(URL);
        const $ = cheerio.load(data);
        
        console.log("Analyzing Columns...");
        
        // Find links that we know exist (from previous read_url output) to see where they live
        // e.g. "SBI PO"
        const knownLink = $('a').filter((i, el) => $(el).text().includes('SBI PO')).first();
        
        if (knownLink.length) {
            console.log("Found known link: " + knownLink.text());
            let parent = knownLink.parent();
            for(let i=0; i<5; i++) {
                console.log(`Parent ${i}: <${parent.prop('tagName')} class="${parent.attr('class')}" id="${parent.attr('id')}">`);
                // If it has a previous sibling that looks like a header
                if (parent.prev().length) {
                    console.log(`   Prev Sibling: <${parent.prev().prop('tagName')} class="${parent.prev().attr('class')}"> text="${parent.prev().text().substring(0,20)}"`);
                }
                parent = parent.parent();
            }
        } else {
            console.log("Could not find known link.");
        }

    } catch (e) {
        console.error(e);
    }
}

debug();
