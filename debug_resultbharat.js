import axios from 'axios';
import * as cheerio from 'cheerio';

const URL = 'https://www.resultbharat.com/';

async function debug() {
    try {
        const { data } = await axios.get(URL);
        const $ = cheerio.load(data);
        
        console.log("Analyzing Structure...");
        
        // ResultBharat usually has columns or specific divs
        // Let's look for headers and their parents
        const terms = ['Result', 'Admit Card', 'Latest Job'];
        
        terms.forEach(term => {
            console.log(`\n--- Searching for Header: ${term} ---`);
            $(`*:contains('${term}')`).each((i, el) => {
                 // Filter tiny text or huge containers
                 const text = $(el).text().trim();
                 if (text.length < 50 && $(el).children().length < 5) {
                     console.log(`Tag: <${el.tagName} class="${$(el).attr('class')}"> : "${text}"`);
                     console.log(`Parent: <${$(el).parent().prop('tagName')} class="${$(el).parent().attr('class')}">`);
                     // Check if next sibling is a table or list
                     const next = $(el).parent().next(); 
                     if(next.length) console.log(`Parent's Next Sibling: <${next.prop('tagName')} class="${next.attr('class')}">`);
                 }
            });
        });

    } catch (e) {
        console.error(e);
    }
}

debug();
