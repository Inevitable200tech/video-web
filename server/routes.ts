import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import {
  insertVideoSchema,
  insertUserSchema,
  insertCommentSchema,
  type Video,
  insertSourceSchema,
} from "@shared/schema";
import { getModels } from "./db";
import { CATEGORIES } from "@shared/constants";
import { z } from "zod";
import fs from "fs";
import http from "http";
import https from "https";
import axios from "axios";
import path from "path";
import dotenv from "dotenv";
import multer from "multer";
import FormData from "form-data";
import { getAuth, clerkClient } from "@clerk/express";
import { Resend } from "resend";

// Reusable agents for keep-alive connections to speed up internal API calls
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const axiosInstance = axios.create({
  httpAgent,
  httpsAgent,
});

const rootEnvPath = path.resolve("cert.env");
const folderEnvPath = path.resolve("cert_env", "cert.env");
export const envPath = fs.existsSync(rootEnvPath) ? rootEnvPath : folderEnvPath;
dotenv.config({ path: envPath });

const resend = new Resend(process.env.RESEND_API_KEY || "re_test_key");


const STORAGE_API_URL = process.env.STORAGE_API_URL || "http://localhost:3000";
const STORAGE_API_TOKEN = process.env.STORAGE_API_TOKEN || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "[EMAIL_ADDRESS]";



// Increased file size limit to 2GB to match the frontend and storage requirements
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }
});

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    let user = await storage.getUserByExternalId(userId);

    // Always sync with Clerk to ensure role updates are picked up
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || `${clerkUser.id}@no-email.com`;
    const username = clerkUser.username || clerkUser.firstName || email.split("@")[0] || "User";
    const role = ((clerkUser.publicMetadata?.role as string) || "user") as "admin" | "user";

    if (!user) {
      // If not found by externalId, check if a user exists with this email
      const existingUserByEmail = await storage.getUserByEmail(email);

      if (existingUserByEmail) {
        // Link existing email account to this new externalId
        user = await storage.updateUser(existingUserByEmail.id || (existingUserByEmail as any)._id.toString(), { externalId: userId });
      } else {
        // Truly a new user
        user = await storage.createUser({
          externalId: userId,
          username,
          email,
          role,
          isVerified: true
        });
      }
    } else if (user.role !== role || user.username !== username) {
      // Sync updates if they changed in Clerk
      user = await storage.updateUser(user.id || (user as any)._id.toString(), { role, username });
    }

    (req as any).user = user;
    next();
  } catch (err) {
    console.error("[AUTH ERROR]", err);
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ message: "Administrator privileges required" });
    }
    next();
  });
}


export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/me", requireAuth, (req, res) => {
    const user = (req as any).user;
    res.json({
      id: user._id || user.id,
      username: user.username,
      role: user.role,
      bio: user.bio,
      avatarHash: user.avatarHash
    });
  });

  app.get("/api/users/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Get videos uploaded by this user
      const userVideos = await storage.getVideosByUser(String(user._id));

      // Aggregate stats
      const totalViews = userVideos.reduce((sum: number, v: Video) => sum + (v.views || 0), 0);
      const totalLikes = userVideos.reduce((sum: number, v: Video) => sum + (v.likes || 0), 0);

      res.json({
        id: user._id,
        username: user.username,
        bio: user.bio || null,
        role: user.role,
        createdAt: user.createdAt,
        stats: {
          totalVideos: userVideos.length,
          totalViews,
          totalLikes,
        },
        videos: userVideos.map(v => ({
          id: v.id,
          title: v.title,
          hash: v.hash,
          thumbnailHash: v.thumbnailHash,
          views: v.views,
          likes: v.likes,
          uploadedAt: v.uploadedAt,
          category: v.category,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ═══════════ ADMIN USER MANAGEMENT ═══════════
  app.get("/api/admin/users", requireAuth, async (req, res) => {
    if ((req as any).user?.role !== "admin") {
      console.log(`[ADMIN] Admin access required`);
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      // 1. Fetch all users from Clerk
      const clerkUsers = await clerkClient.users.getUserList();
      console.log(`[ADMIN] Found ${clerkUsers.data.length} users in Clerk`);

      // 2. Ensure each Clerk user exists in our local DB
      const syncedUsers = await Promise.all(clerkUsers.data.map(async (clerkUser) => {
        let localUser = await storage.getUserByExternalId(clerkUser.id);
        const email = clerkUser.emailAddresses[0]?.emailAddress || `${clerkUser.id}@no-email.com`;
        const username = clerkUser.username || clerkUser.firstName || email.split("@")[0] || "User";
        const role = (clerkUser.publicMetadata?.role as string) || "user";

        if (!localUser) {
          console.log(`[ADMIN] Pre-syncing new Clerk user: ${username}`);
          localUser = await storage.createUser({
            externalId: clerkUser.id,
            username,
            email,
            role: role as "admin" | "user",
            isVerified: true
          });
        } else if (localUser.role !== role) {
          // Sync role if it changed in Clerk
          localUser = await storage.updateUser(localUser._id.toString(), { role: role as "admin" | "user" });
        }
        if (!localUser) return null;

        // Return a clean object with 'id' for the frontend
        const userObj = (localUser as any).toObject ? (localUser as any).toObject() : localUser;
        return {
          ...userObj,
          id: userObj._id?.toString() || userObj.id
        };
      }));

      res.json(syncedUsers.filter(u => u !== null));
    } catch (error) {
      console.error("[ADMIN] Failed to fetch/sync users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", requireAuth, async (req, res) => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const { id } = req.params;
      if (!id || id === "undefined") {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, async (req, res) => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const { id } = req.params;

      if (!id || id === "undefined") {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const userToDelete = await storage.getUser(id);

      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }

      // 1. Delete from Clerk if it's a Clerk user
      if (userToDelete.externalId) {
        try {
          await clerkClient.users.deleteUser(userToDelete.externalId);
          console.log(`[ADMIN] Deleted user ${id} from Clerk (${userToDelete.externalId})`);
        } catch (clerkErr: any) {
          // If user is already gone from Clerk, we continue to delete from DB
          console.warn(`[ADMIN] Clerk deletion warning for ${id}:`, clerkErr.message);
        }
      }

      // 2. Delete from our local DB
      const success = await storage.deleteUser(id);
      if (!success) return res.status(404).json({ message: "User not found in DB" });

      res.json({ message: "User removed from system and Clerk successfully" });
    } catch (error) {
      console.error("[ADMIN] Failed to delete user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ═══════════ ADMIN SOURCE MANAGEMENT ═══════════
  app.get("/api/admin/sources", requireAuth, async (req, res) => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const sources = await storage.getSources();
      res.json(sources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sources" });
    }
  });

  app.post("/api/admin/sources", requireAuth, async (req, res) => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const data = insertSourceSchema.parse(req.body);
      const source = await storage.createSource(data);
      res.status(201).json(source);
    } catch (error) {
      res.status(400).json({ message: "Invalid source data" });
    }
  });

  app.patch("/api/admin/sources/:id", requireAuth, async (req, res) => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const { id } = req.params;
      const source = await storage.updateSource(id, req.body);
      if (!source) return res.status(404).json({ message: "Source not found" });
      res.json(source);
    } catch (error) {
      res.status(500).json({ message: "Failed to update source" });
    }
  });

  app.delete("/api/admin/sources/:id", requireAuth, async (req, res) => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const { id } = req.params;
      const success = await storage.deleteSource(id);
      if (!success) return res.status(404).json({ message: "Source not found" });
      res.json({ message: "Source deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete source" });
    }
  });

  app.post("/api/admin/sources/sync", requireAuth, async (req, res) => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      // Trigger sync manually
      await syncAllSources();
      res.json({ message: "Synchronization initiated" });
    } catch (error) {
      res.status(500).json({ message: "Synchronization failed" });
    }
  });

  // ═══════════ VIDEO SYNC LOGIC ═══════════
  const PROMO_REGEX = / -? Desi new videoz hd \/ sd - DropMMS Unblock|DropMMS Unblock/gi;
  function cleanTitle(title: string): string {
    if (!title) return "Untitled Video";
    return title.replace(PROMO_REGEX, "").replace(/\s+/g, " ").trim();
  }

  let initialCleaningDone = false;
  let isSyncing = false;
  let lastGlobalSyncTime = 0;

  async function syncAllSources() {
    if (isSyncing) return;

    const now = Date.now();
    const TWO_MINUTES = 2 * 60 * 1000;

    if (now - lastGlobalSyncTime < TWO_MINUTES) {
      console.log(`[SYNC] Skipping sync: Last sync was only ${Math.round((now - lastGlobalSyncTime) / 1000)}s ago (Threshold: 120s)`);
      return;
    }

    try {
      isSyncing = true;
      lastGlobalSyncTime = now;
      let sources = await storage.getSources(true); // only active

      // Migration: If no sources exist, create one from env vars
      if (sources.length === 0 && process.env.STORAGE_API_URL) {
        console.log("[SYNC] No sources found in DB. Migrating from environment variables...");
        const defaultSource = await storage.createSource({
          name: "Default Storage",
          url: process.env.STORAGE_API_URL,
          token: process.env.STORAGE_API_TOKEN,
          isActive: true
        });
        sources = [defaultSource];
      }

      console.log(`[SYNC] Starting sync for ${sources.length} sources...`);

      for (const source of sources) {
        await syncVideosFromSource(source);
      }
    } finally {
      isSyncing = false;
    }
  }

  async function syncVideosFromSource(source: any) {
    try {
      console.log(`[SYNC] Syncing from source: ${source.name} (${source.url})`);

      // 0. Clean existing titles in DB (Only once on server startup)
      const { VideoModel } = getModels();
      if (!initialCleaningDone) {
        console.log("[SYNC] Performing initial title cleaning and schema updates...");
        const targetPhrase = "Desi new videoz hd / sd - DropMMS Unblock";
        await VideoModel.updateMany(
          { title: { $regex: targetPhrase } },
          [{ $set: { title: { $trim: { input: { $replaceOne: { input: "$title", find: ` - ${targetPhrase}`, replacement: "" } } } } } }]
        );
        await VideoModel.updateMany(
          { title: { $regex: targetPhrase } },
          [{ $set: { title: { $trim: { input: { $replaceOne: { input: "$title", find: targetPhrase, replacement: "" } } } } } }]
        );

        await VideoModel.updateMany(
          { likes: { $exists: false } },
          { $set: { likes: 0 } }
        );
        initialCleaningDone = true;
      }

      const response = await axiosInstance.get(`${source.url}/api/public/files`, {
        headers: source.token ? { "Authorization": `Bearer ${source.token}` } : {},
        timeout: 10000
      });

      if (response.data.success && Array.isArray(response.data.files)) {
        const files = response.data.files;

        const { BlacklistedVideoModel, VideoModel } = getModels();
        // Fetch blacklist to prevent re-adding deleted videos
        const blacklistedDocs = await BlacklistedVideoModel.find({}).select('hash').lean().exec();
        const blacklistedHashes = new Set(blacklistedDocs.map((b: any) => b.hash));

        const existingVideos = await VideoModel.find({
          hash: { $in: files.map((f: any) => f.hash) }
        }).select('hash thumbnailHash');

        const existingMap = new Map(existingVideos.map((v: any) => [v.hash, v as any]));

        // Filter: Must not be in DB AND must not be in Blacklist
        const newVideos = files.filter((f: any) =>
          !existingMap.has(f.hash) && !blacklistedHashes.has(f.hash)
        );

        const videosToUpdate = files.filter((f: any) => {
          const existing = existingMap.get(f.hash);
          return existing && !(existing as any).thumbnailHash && f.thumbnail_address;
        });

        if (newVideos.length > 0) {
          const videoDocs = newVideos.map((f: any) => ({
            title: cleanTitle(f.title || f.filename),
            description: "Auto-discovered from storage network.",
            hash: f.hash,
            thumbnailHash: f.thumbnail_address,
            category: "Cinema",
            sourceId: source.id || source._id,
            uploadedAt: f.created_at || new Date()
          }));
          await VideoModel.insertMany(videoDocs);
          console.log(`[SYNC] Inserted ${newVideos.length} new videos from ${source.name}`);
        }

        if (videosToUpdate.length > 0) {
          const bulkOps = videosToUpdate.map((v: any) => ({
            updateOne: {
              filter: { hash: v.hash },
              update: { $set: { thumbnailHash: v.thumbnail_address } }
            }
          }));
          await VideoModel.bulkWrite(bulkOps);
        }

        // Update lastSync timestamp for the source
        await storage.updateSource(source.id || source._id, { lastSync: new Date() });
      }
    } catch (err: any) {
      console.warn(`[SYNC ERROR] ${source.name}:`, err.message);
    }
  }

  // Video Routes
  app.get("/api/videos", async (req, res) => {
    try {
      // Fire-and-forget sync across all sources
      syncAllSources().catch(() => { });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const { category, q, sortBy } = req.query;

      const result = await storage.getVideos(category as string, skip, limit, q as string, sortBy as string);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/:hash", async (req, res) => {
    try {
      const { hash } = req.params;
      const video = await storage.getVideoByHash(hash);
      if (!video) return res.status(404).json({ message: "Video not found" });

      // Return metadata ONLY (fast)
      res.json(video);
    } catch (error: any) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/videos/:hash/playback", async (req, res) => {
    try {
      const { hash } = req.params;



      // 2. Resolve source
      let sourceUrl = STORAGE_API_URL;
      let sourceToken = STORAGE_API_TOKEN;

      const video = await storage.getVideoByHash(hash);
      if (video && video.sourceId) {
        const { SourceModel } = getModels();
        const source = await SourceModel.findById(video.sourceId).lean().exec() as any;
        if (source && source.isActive) {
          sourceUrl = source.url;
          sourceToken = source.token || "";
        }
      }

      if (!sourceUrl) {
        return res.status(503).json({ message: "No active storage source found for this video" });
      }

      // 3. Fetch signed URL from storage API
      try {
        console.log(`[STORAGE] Fetching signed URL from ${sourceUrl} for hash: ${hash}`);
        const response = await axiosInstance.get(`${sourceUrl}/api/public/file/${hash}`, {
          headers: sourceToken ? { "Authorization": `Bearer ${sourceToken}` } : {},
          timeout: 10000
        });

        if (response.data.success) {
          const playbackUrl = response.data.download.url;



          await storage.incrementViews(hash);
          res.json({
            playbackUrl,
            expiresAt: response.data.download.expiresAt
          });
        } else {
          res.status(500).json({ message: "Storage API returned failure", error: response.data.error });
        }
      } catch (err: any) {
        console.error("Storage API Error:", err.response?.data || err.message);
        res.status(503).json({ message: "Storage service unavailable" });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/videos/:hash/like", async (req, res) => {
    try {
      const { hash } = req.params;
      const video = await storage.incrementLikes(hash);
      if (!video) return res.status(404).json({ message: "Video not found" });
      res.json(video);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to like video" });
    }
  });

  app.get("/api/categories/thumbnails", async (_req, res) => {
    try {
      const thumbnails = await storage.getCategoryThumbnails(CATEGORIES);
      res.json(thumbnails);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch category thumbnails" });
    }
  });

  app.post("/api/videos/upload", requireAuth, async (req, res) => {
    res.status(503).json({
      message: "Upload system is temporarily offline for maintenance and optimization. Please check back later."
    });
  });

  app.delete("/api/videos/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteVideo(req.params.id);
      if (success) res.json({ success: true });
      else res.status(404).json({ message: "Video not found" });
    } catch (error: any) {
      res.status(500).json({ message: "Delete failed" });
    }
  });

  app.patch("/api/videos/bulk", requireAdmin, async (req, res) => {
    try {
      const { ids, titlePattern, category } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No video IDs provided" });
      }

      if (titlePattern) {
        // Individual updates to handle the {n} increment
        const updates = ids.map(async (id, index) => {
          const newTitle = titlePattern.replace("{n}", (index + 1).toString());
          const updateData: any = { title: newTitle };
          if (category) updateData.category = category;

          const { VideoModel } = getModels();
          await VideoModel.findByIdAndUpdate(id, { $set: updateData }).exec();
        });
        await Promise.all(updates);
        res.json({ success: true, count: ids.length });
      } else if (category) {
        const count = await storage.bulkUpdateVideos(ids, { category });
        res.json({ success: true, count });
      } else {
        res.status(400).json({ message: "No updates provided" });
      }
    } catch (error: any) {
      console.error("[BULK UPDATE ERROR]", error.message);
      res.status(500).json({ message: "Bulk update failed" });
    }
  });

  // Comment Routes
  app.get("/api/videos/:videoId/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.videoId);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", requireAuth, async (req, res) => {
    try {
      const data = insertCommentSchema.parse(req.body);
      const user = (req as any).user;
      const comment = await storage.createComment(data, user._id.toString());

      // Populate user info for the response
      const populatedComment = {
        ...comment,
        userId: {
          _id: user._id,
          username: user.username,
          avatarHash: user.avatarHash
        }
      };

      res.status(201).json(populatedComment);
    } catch (error: any) {
      console.error("[COMMENT ERROR]", error.message);
      res.status(400).json({ message: "Invalid comment data" });
    }
  });

  // ═══════════ DATABASE MANAGEMENT ═══════════
  app.get("/api/admin/databases", requireAdmin, async (req, res) => {
    try {
      const dbs = await storage.getSecondaryDatabases();
      res.json(dbs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch databases" });
    }
  });

  app.post("/api/admin/databases", requireAdmin, async (req, res) => {
    try {
      const { name, url } = req.body;
      if (!name || !url) return res.status(400).json({ message: "Name and URL are required" });
      const db = await storage.createSecondaryDatabase({ name, url });
      res.status(201).json(db);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to add database" });
    }
  });

  app.delete("/api/admin/databases/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteSecondaryDatabase(req.params.id);
      if (success) res.json({ success: true });
      else res.status(404).json({ message: "Database not found" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete database" });
    }
  });

  // ═══════════ BLACKLIST MANAGEMENT ═══════════
  app.get("/api/admin/blacklist", requireAdmin, async (req, res) => {
    try {
      const blacklist = await storage.getBlacklist();

      // Attempt to recover missing titles/thumbnails for older records
      const untitled = blacklist.filter(item => !item.title || !item.thumbnailHash);

      if (untitled.length > 0) {
        console.log(`[BLACKLIST] Attempting to recover metadata for ${untitled.length} items...`);
        const sources = await storage.getSources(true);

        for (const source of sources) {
          try {
            const response = await axiosInstance.get(`${source.url}/api/public/files`, {
              headers: source.token ? { "Authorization": `Bearer ${source.token}` } : {},
              timeout: 5000
            });

            if (response.data.success && Array.isArray(response.data.files)) {
              const remoteFiles = response.data.files;

              for (const item of untitled) {
                const match = remoteFiles.find((f: any) => f.hash === item.hash);
                if (match) {
                  item.title = cleanTitle(match.title || match.filename);
                  item.thumbnailHash = match.thumbnail_address;

                  // Update the DB silently
                  const { BlacklistedVideoModel } = getModels();
                  await BlacklistedVideoModel.updateOne(
                    { hash: item.hash },
                    { $set: { title: item.title, thumbnailHash: item.thumbnailHash } }
                  ).exec();
                }
              }
            }
          } catch (err) {
            console.error(`[RECOVERY ERROR] Failed to fetch from ${source.name}`);
          }
        }
      }

      res.json(blacklist);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch blacklist" });
    }
  });

  app.delete("/api/admin/blacklist/:hash", requireAdmin, async (req, res) => {
    try {
      const success = await storage.removeFromBlacklist(req.params.hash);
      if (success) {
        // Trigger a sync to re-discover the restored video
        syncAllSources().catch(err => console.error("[RESTORE SYNC ERROR]", err.message));
        res.json({ success: true, message: "Video restored (will appear after sync)" });
      } else {
        res.status(404).json({ message: "Hash not found in blacklist" });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to remove from blacklist" });
    }
  });

  // 🚀 Immediate Startup Sync
  // Runs once when the server starts to clean titles and discover new videos
  syncAllSources().catch(err => console.error("[STARTUP SYNC ERROR]", err.message));

  // DMCA Report Route
  app.post("/api/dmca-report", requireAuth, async (req, res) => {
    try {
      const { videoId, videoTitle, videoHash, conflictType, details } = req.body;
      const user = (req as any).user;

      if (!videoId || !details) {
        return res.status(400).json({ message: "Video ID and details are required." });
      }

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h1 style="color: #e11d48; border-bottom: 2px solid #e11d48; padding-bottom: 10px;">Legal Takedown Report</h1>
          <p><strong>Reporter:</strong> ${user.username} (${user.email})</p>
          <p><strong>Conflict Type:</strong> ${conflictType || "Not Specified"}</p>
          <p><strong>Video Title:</strong> ${videoTitle}</p>
          <p><strong>Video Link:</strong> <a href="${req.protocol}://${req.get("host")}/watch/${videoHash}">View Video (${videoHash})</a></p>
          <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #94a3b8; margin-top: 20px;">
            <p style="margin: 0;"><strong>Report Details:</strong></p>
            <p style="margin-top: 8px; white-space: pre-wrap;">${details}</p>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 30px;">Action is required within 48 hours to maintain legal safe harbor compliance.</p>
        </div>
      `;
      console.log("[DMCA] Attempting to send email to", process.env.RESEND_API_KEY);
      if (process.env.RESEND_API_KEY) {
        console.log(`[DMCA] Attempting to send email to ${ADMIN_EMAIL} using Resend...`);
        const { data, error } = await resend.emails.send({
          from: "Legal Compliance <onboarding@resend.dev>",
          to: ADMIN_EMAIL,
          subject: `🚨 [${conflictType || "Legal Report"}] Action Required: ${videoTitle}`,
          html: emailHtml,
        });

        if (error) {
          console.error("[RESEND ERROR]", JSON.stringify(error, null, 2));
          return res.status(500).json({ message: "Failed to send email via Resend", details: error });
        }

        console.log(`[DMCA] Report sent successfully to ${ADMIN_EMAIL} for video ${videoId}. Resend ID: ${data?.id}`);
      } else {
        console.warn(`[DMCA] RESEND_API_KEY is not set. Saving report to logs only.`);
        console.log(emailHtml);
      }

      res.json({ success: true, message: "DMCA report submitted successfully." });
    } catch (error: any) {
      console.error("[DMCA ERROR]", error);
      res.status(500).json({ message: "Failed to submit DMCA report." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
