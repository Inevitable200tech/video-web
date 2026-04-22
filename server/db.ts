import mongoose from "mongoose";
import { 
  models, 
  type User, type Video, type Comment, type Source, type OTP, type BlacklistedVideo,
  type SecondaryDatabase, SecondaryDatabaseModel
} from "@shared/schema";
import { log } from "./vite";

// Connection instances
let primaryConn: mongoose.Connection;
let secondaryConns: mongoose.Connection[] = [];

export async function connectDatabases() {
  const primaryUrl = process.env.MONGO_URL;
  if (!primaryUrl) {
    throw new Error("MONGO_URL is not defined in environment variables");
  }
  
  try {
    // 1. Connect Primary
    primaryConn = await mongoose.createConnection(primaryUrl).asPromise();
    log(`[DB] Primary Database Connected: ${primaryUrl.split('@')[1]?.split('?')[0] || 'Local'}`);

    // 2. Fetch Secondary DBs from Primary
    // Note: On first startup, SecondaryDatabaseModel might not have data
    const SecondaryDB = primaryConn.model<SecondaryDatabase>("SecondaryDatabase", models.SecondaryDatabase);
    const activeDBs = await SecondaryDB.find({ isActive: true }).lean().exec();

    log(`[DB] Found ${activeDBs.length} active secondary database(s) in configuration.`);

    // 3. Connect to all secondaries
    secondaryConns = [];
    for (const db of activeDBs) {
      try {
        const conn = await mongoose.createConnection(db.url).asPromise();
        secondaryConns.push(conn);
        log(`[DB] Connected to Secondary: ${db.name} (${db.url.split('@')[1]?.split('?')[0] || 'Local'})`);
      } catch (err: any) {
        log(`[DB ERROR] Failed to connect to secondary "${db.name}": ${err.message}`);
      }
    }

    return { primaryConn, secondaryConns };
  } catch (err: any) {
    log(`[DB ERROR] Connection failed: ${err.message}`);
    throw err;
  }
}

// ---------------- MODEL BINDING ----------------

export const getModels = () => {
  if (!primaryConn) {
    throw new Error("Databases not connected. Call connectDatabases() first.");
  }

  // Primary Models
  const PrimaryModels = {
    UserModel: primaryConn.model<User>("User", models.User),
    SourceModel: primaryConn.model<Source>("Source", models.Source),
    OTPModel: primaryConn.model<OTP>("OTP", models.OTP),
    SecondaryDatabaseModel: primaryConn.model<SecondaryDatabase>("SecondaryDatabase", models.SecondaryDatabase),
    
    // We also define these on Primary as a fallback
    VideoModel: primaryConn.model<Video>("Video", models.Video),
    CommentModel: primaryConn.model<Comment>("Comment", models.Comment),
    BlacklistedVideoModel: primaryConn.model<BlacklistedVideo>("BlacklistedVideo", models.BlacklistedVideo),
  };

  // Secondary Models (Multi-Instance)
  const allVideoModels = [PrimaryModels.VideoModel];
  const allCommentModels = [PrimaryModels.CommentModel];
  const allBlacklistModels = [PrimaryModels.BlacklistedVideoModel];

  for (const conn of secondaryConns) {
    allVideoModels.push(conn.model<Video>("Video", models.Video));
    allCommentModels.push(conn.model<Comment>("Comment", models.Comment));
    allBlacklistModels.push(conn.model<BlacklistedVideo>("BlacklistedVideo", models.BlacklistedVideo));
  }

  return {
    ...PrimaryModels,
    // For Writes: Use the LAST added secondary connection (the newest "overflow" instance)
    // If no secondaries, fall back to Primary
    WriteVideoModel: allVideoModels[allVideoModels.length - 1],
    WriteCommentModel: allCommentModels[allCommentModels.length - 1],
    WriteBlacklistModel: allBlacklistModels[allBlacklistModels.length - 1],

    // For Reads: Use all models
    AllVideoModels: allVideoModels,
    AllCommentModels: allCommentModels,
    AllBlacklistModels: allBlacklistModels,
  };
};

