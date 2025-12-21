import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testConnection() {
    const uri = process.env.MONGODB_URI;
    console.log("Testing MongoDB Connection...");
    
    if (!uri) {
        console.error("❌ Error: MONGODB_URI is missing in .env");
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log("✅ Success! Connected to MongoDB.");
        
        // Optional: List collections to be sure
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections.`);
        
        await mongoose.disconnect();
    } catch (error) {
        console.error("❌ Connection Failed:", error.message);
    }
}

testConnection();
