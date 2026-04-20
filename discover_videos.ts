import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env for video-web
const videoWebEnv = path.resolve('cert.env');
dotenv.config({ path: videoWebEnv });

const STORAGE_MONGO_URI = "mongodb+srv://ciwag83978_db_user:TOQAxK0sUwaS10nf@main-instance-storage.l55dlza.mongodb.net/?appName=main-instance-storage";
const VIDEO_WEB_MONGO_URI = process.env.MONGO_URL;

if (!VIDEO_WEB_MONGO_URI) {
    console.error("MONGO_URL not found in cert.env");
    process.exit(1);
}

// Storage API Schemas
const storageFileSchema = new mongoose.Schema({
    hash: String,
    filename: String,
    title: String,
    size: Number,
    status: String,
    created_at: Date
}, { collection: 'files' });

// Video Web Schemas (Matching shared/schema.ts)
const videoWebSchema = new mongoose.Schema({
    title: String,
    description: String,
    hash: String,
    category: String,
    views: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now }
}, { collection: 'videos' });

async function sync() {
    console.log("🚀 Starting synchronization...");

    // 1. Connect to Storage DB
    const storageConn = await mongoose.createConnection(STORAGE_MONGO_URI).asPromise();
    const StorageFile = storageConn.model('File', storageFileSchema);
    console.log("✅ Connected to Storage DB");

    // 2. Connect to Video Web DB
    const videoWebConn = await mongoose.createConnection(VIDEO_WEB_MONGO_URI).asPromise();
    const VideoWeb = videoWebConn.model('Video', videoWebSchema);
    console.log("✅ Connected to Video Web DB");

    // 3. Fetch all files from storage
    const files = await StorageFile.find({ status: 'active' });
    console.log(`🔍 Found ${files.length} files in storage`);

    let synced = 0;
    for (const file of files) {
        const existing = await VideoWeb.findOne({ hash: file.hash });
        if (!existing) {
            await VideoWeb.create({
                title: file.title || file.filename,
                description: "Imported from storage system.",
                hash: file.hash,
                category: "Cinema",
                uploadedAt: file.created_at || new Date()
            });
            console.log(`  + Synced: ${file.title || file.filename}`);
            synced++;
        }
    }

    console.log(`\n✨ Sync complete! Added ${synced} new videos.`);
    
    await storageConn.close();
    await videoWebConn.close();
    process.exit(0);
}

sync().catch(err => {
    console.error("❌ Sync failed:", err);
    process.exit(1);
});
