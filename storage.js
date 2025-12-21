import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  category: String,
  text: String,
  dateFound: { type: Date, default: Date.now }
});

const Link = mongoose.model('Link', linkSchema);

let connection = null;

export async function initDB() {
    if (connection) return connection;
    
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI is missing in .env");
        return null; // Fallback or crash
    }
    
    try {
        connection = await mongoose.connect(uri);
        console.log("Connected to MongoDB");
        return connection;
    } catch (e) {
        console.error("MongoDB Connection Error:", e);
        return null;
    }
}

// For compatibility with previous "loadState" logic, we will fetch ALL URLs
// Optimization: For large DBs, this is bad, but for <10k links it's fine.
// Better approach: check existence one by one or using $in.
export async function loadState() {
    try {
        if (!process.env.MONGODB_URI) return { seenLinks: [] };
        
        // Return object structure matching original file-based state
        const links = await Link.find({}, 'url').lean();
        return {
            seenLinks: links.map(l => l.url) 
        };
    } catch (error) {
        console.error('Error loading state from DB:', error);
        return { seenLinks: [] };
    }
}

// "saveState" previously overwrote the file. 
// "updateState" in index.js appended to memory.
// We need a function to INSERT NEW items only.
export async function saveNewLinks(items, category) {
    if (!items || items.length === 0) return;
    if (!process.env.MONGODB_URI) return;

    try {
        // Prepare documents
        const docs = items.map(item => ({
            url: item.url,
            text: item.text,
            category: category
        }));

        // Insert, ignoring duplicates (ordered: false continues even if one fails)
        await Link.insertMany(docs, { ordered: false })
            .catch(e => {
                // Ignore separate duplicate key errors if some succeed
                if (e.code !== 11000) console.error("Partial insert error:", e.message);
            });
            
    } catch (error) {
        if (error.code !== 11000) { // 11000 is duplicate key error
            console.error('Error saving new links to DB:', error.message);
        }
    }
}

export function filterNewItems(currentState, scrapedItems) {
    const newItems = [];
    const seenSet = new Set(currentState.seenLinks);
    
    scrapedItems.forEach(item => {
        if (!seenSet.has(item.url)) {
            newItems.push(item);
        }
    });
    
    return newItems;
}

// In memory update helper (same as before)
export function updateState(currentState, newItems) {
    newItems.forEach(item => {
        currentState.seenLinks.push(item.url);
    });
    return currentState;
}
