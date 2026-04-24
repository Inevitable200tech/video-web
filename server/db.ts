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

  // ── Primary Models ─────────────────────────────────────────────────────────
  // Users, Comments, Sources, OTPs, and config all live in the primary DB.
  // This keeps userId references resolvable without cross-connection lookups.
  const PrimaryModels = {
    UserModel:              primaryConn.model<User>("User", models.User),
    SourceModel:            primaryConn.model<Source>("Source", models.Source),
    OTPModel:               primaryConn.model<OTP>("OTP", models.OTP),
    SecondaryDatabaseModel: primaryConn.model<SecondaryDatabase>("SecondaryDatabase", models.SecondaryDatabase),

    // Comments reference Users → must share the same connection for populate()
    CommentModel:           primaryConn.model<Comment>("Comment", models.Comment),

    // Primary also acts as fallback / index 0 for Videos and Blacklist
    VideoModel:             primaryConn.model<Video>("Video", models.Video),
    BlacklistedVideoModel:  primaryConn.model<BlacklistedVideo>("BlacklistedVideo", models.BlacklistedVideo),
  };

  // ── Secondary Models (Videos only) ────────────────────────────────────────
  // Videos are spread across all DB instances for horizontal scaling.
  // Blacklist is kept on primary (admin config data, small dataset).
  const allVideoModels = [PrimaryModels.VideoModel];

  for (const conn of secondaryConns) {
    allVideoModels.push(conn.model<Video>("Video", models.Video));
  }

  return {
    ...PrimaryModels,

    // Video writes go to the newest secondary (overflow instance).
    // Falls back to primary if no secondaries are connected.
    WriteVideoModel:    allVideoModels[allVideoModels.length - 1],

    // Comments and Blacklist always use primary
    WriteCommentModel:  PrimaryModels.CommentModel,
    WriteBlacklistModel: PrimaryModels.BlacklistedVideoModel,

    // Read from all video instances; everything else reads from primary only
    AllVideoModels:     allVideoModels,
    AllCommentModels:   [PrimaryModels.CommentModel],
    AllBlacklistModels: [PrimaryModels.BlacklistedVideoModel],
  };
};

