import axios from 'axios';
import * as cheerio from 'cheerio';

const URL = 'https://sarkariresult.com.cm/';

async function debug() {
    try {
        const { data } = await axios.get(URL);
        const $ = cheerio.load(data);
        
        const terms = ['Result', 'Admit Card', 'Latest Job'];
        
        terms.forEach(term => {
            console.log(`\n--- Searching for: ${term} ---`);
            // Find all elements containing the term
            $(`*:contains('${term}')`).each((i, el) => {
                // Filter out large containers (body, html) to avoid spam
                if ($(el).children().length < 10 && $(el).text().length < 100) {
                    console.log(`Found in <${el.tagName} class="${$(el).attr('class')}">: ${$(el).text().trim()}`);
                    console.log(`Parent: <${$(el).parent().prop('tagName')} class="${$(el).parent().attr('class')}">`);
                    console.log(`Next Sibling: <${$(el).next().prop('tagName')} class="${$(el).next().attr('class')}">`);
                }
            });
        });

    } catch (e) {
        console.error(e);
    }
}

debug();
