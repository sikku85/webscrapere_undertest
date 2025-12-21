import axios from 'axios';
import * as cheerio from 'cheerio';

const URL = 'https://sarkariresult.com.cm/';

async function debug() {
    try {
        const { data } = await axios.get(URL);
        const $ = cheerio.load(data);
        
        console.log("Analyzing Lists (ul)...");
        $('ul').each((i, ul) => {
            // Get previous 3 siblings to find a header
            let prev = $(ul).prev();
            let headerText = "";
            for(let j=0; j<3; j++) {
                if(prev.length) {
                    const text = prev.text().trim();
                    if(text.length > 0 && text.length < 50) {
                        headerText = text;
                        break;
                    }
                    prev = prev.prev();
                }
            }
            
            if (headerText) {
                console.log(`\nHeader: "${headerText}"`);
                console.log(`List Class: "${$(ul).attr('class') || ''}"`);
                console.log(`Sample Link: ${$(ul).find('a').first().text().trim()}`);
            }
        });

    } catch (e) {
        console.error(e);
    }
}

debug();
