import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import {
  insertVideoSchema,
  insertUserSchema,
  insertCommentSchema,
  VideoModel,
  type Video,
} from "@shared/schema";
import { CATEGORIES } from "@shared/constants";
import { z } from "zod";
import jwt from "jsonwebtoken";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import http from "http";
import https from "https";

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

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "password";
const STORAGE_API_URL = process.env.STORAGE_API_URL || "http://localhost:3000";
const STORAGE_API_TOKEN = process.env.STORAGE_API_TOKEN || "";

// Simple in-memory cache for playback URLs to speed up loading
const playbackCache = new Map<string, { url: string; expires: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Increased file size limit to 2GB to match the frontend and storage requirements
export const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } 
});

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    (req as any).user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth Routes
  app.post("/api/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Password hashing would go here in a production app
      // For this implementation, we'll store it as is or use a simple hash
      const user = await storage.createUser(data);
      const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(201).json({ user: { id: user._id, username: user.username, role: user.role }, token });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    
    // Check for admin hardcoded credentials first (for legacy compatibility)
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      // Find or create admin user in DB
      let admin = await storage.getUserByUsername(ADMIN_USER);
      if (!admin) {
        admin = await storage.createUser({ username: ADMIN_USER, password: ADMIN_PASS, role: "admin" });
      }
      
      const token = jwt.sign({ userId: admin._id, role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
      });
      return res.json({ user: { id: admin._id, username: admin.username, role: admin.role }, token });
    }

    // Regular user login
    const user = await storage.getUserByUsername(username);
    if (user && user.password === password) { // Simple check for now
      const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      res.json({ user: { id: user._id, username: user.username, role: user.role }, token });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  app.post("/api/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/me", requireAuth, (req, res) => {
    const user = (req as any).user;
    res.json({ id: user._id, username: user.username, role: user.role, bio: user.bio, avatarHash: user.avatarHash });
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
      const users = await storage.getUsers();
      console.log(`[ADMIN] Fetched ${users.length} users`);
      res.json(users);
    } catch (error) {
      console.error("[ADMIN] Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", requireAuth, async (req, res) => {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const { id } = req.params;
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
      const success = await storage.deleteUser(id);
      if (!success) return res.status(404).json({ message: "User not found" });
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ═══════════ VIDEO SYNC LOGIC ═══════════
  // Decoupled from request path to prevent slow page loads
  let lastSyncTime = 0;
  const SYNC_COOLDOWN = 5 * 60 * 1000; // 5 minutes

  const PROMO_REGEX = / -? Desi new videoz hd \/ sd - DropMMS Unblock/gi;

  function cleanTitle(title: string): string {
    if (!title) return "Untitled Video";
    return title.replace(PROMO_REGEX, "").replace(/\s+/g, " ").trim();
  }

  let initialCleaningDone = false;

  async function syncVideosWithStorage() {
    if (Date.now() - lastSyncTime < SYNC_COOLDOWN) return;
    if (!STORAGE_API_URL || !STORAGE_API_TOKEN) return;

    try {
      lastSyncTime = Date.now();
      console.log("[SYNC] Starting background video synchronization...");

      // 0. Clean existing titles in DB (Only once on server startup to avoid overhead)
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
        
        // Initialize likes for old videos
        await VideoModel.updateMany(
          { likes: { $exists: false } },
          { $set: { likes: 0 } }
        );
        initialCleaningDone = true;
      }

      const response = await axiosInstance.get(`${STORAGE_API_URL}/api/public/files`, {
        headers: { "Authorization": `Bearer ${STORAGE_API_TOKEN}` },
        timeout: 10000
      });

      if (response.data.success && Array.isArray(response.data.files)) {
        const files = response.data.files;
        
        const existingVideos = await VideoModel.find({ 
          hash: { $in: files.map((f: any) => f.hash) } 
        }).select('hash thumbnailHash');
        
        const existingMap = new Map(existingVideos.map((v: any) => [v.hash, v]));

        const newVideos = files.filter((f: any) => !existingMap.has(f.hash));
        const videosToUpdate = files.filter((f: any) => {
          const existing = existingMap.get(f.hash);
          // Update if missing thumbnail OR if title still has promo (though updateMany handles the latter)
          return existing && !existing.thumbnailHash && f.thumbnail_address;
        });

        // 1. Bulk Insert New Videos (with clean titles)
        if (newVideos.length > 0) {
          const videoDocs = newVideos.map((f: any) => ({
            title: cleanTitle(f.title || f.filename),
            description: "Auto-discovered from storage network.",
            hash: f.hash,
            thumbnailHash: f.thumbnail_address,
            category: "Cinema",
            uploadedAt: f.created_at || new Date()
          }));
          await VideoModel.insertMany(videoDocs);
          console.log(`[SYNC] Inserted ${newVideos.length} new videos with cleaned titles`);
        }

        // 2. Bulk Update Missing Thumbnails
        if (videosToUpdate.length > 0) {
          const bulkOps = videosToUpdate.map((v: any) => ({
            updateOne: {
              filter: { hash: v.hash },
              update: { $set: { thumbnailHash: v.thumbnail_address } }
            }
          }));
          await VideoModel.bulkWrite(bulkOps);
          console.log(`[SYNC] Updated thumbnails for ${videosToUpdate.length} videos`);
        }
      }
    } catch (err: any) {
      console.warn("[SYNC ERROR]", err.message);
    }
  }

  // Video Routes
  app.get("/api/videos", async (req, res) => {
    try {
      // Fire-and-forget sync in the background
      syncVideosWithStorage().catch(() => {});

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

      // 1. Check Cache
      const cached = playbackCache.get(hash);
      if (cached && cached.expires > Date.now()) {
        console.log(`[STORAGE] Using cached URL for hash: ${hash}`);
        return res.json({
          playbackUrl: cached.url,
          expiresAt: cached.expires
        });
      }

      // 2. Fetch signed URL from storage API (using hash)
      try {
        console.log(`[STORAGE] Fetching signed URL for hash: ${hash}`);
        const response = await axiosInstance.get(`${STORAGE_API_URL}/api/public/file/${hash}`, {
          headers: { "Authorization": `Bearer ${STORAGE_API_TOKEN}` },
          timeout: 10000 // Increased timeout for slow Render nodes
        });
        
        if (response.data.success) {
          const playbackUrl = response.data.download.url;
          const expiresAt = response.data.download.expiresAt;
          
          // Update Cache
          playbackCache.set(hash, { url: playbackUrl, expires: Date.now() + CACHE_TTL });
          
          await storage.incrementViews(hash);
          res.json({
            playbackUrl,
            expiresAt
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

  app.post("/api/videos/upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const { title, description, category } = req.body;

      // 1. Forward to Storage API
      const formData = new FormData();
      formData.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      formData.append("title", title);

      console.log(`[UPLOAD] Forwarding file to storage API: ${STORAGE_API_URL}/api/upload`);
      
      const storageRes = await axiosInstance.post(`${STORAGE_API_URL}/api/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
          "Authorization": `Bearer ${STORAGE_API_TOKEN}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (!storageRes.data.success) {
        return res.status(500).json({ 
          message: "Failed to store video in distributed network", 
          details: storageRes.data.error 
        });
      }

      const hash = storageRes.data.hash;
      console.log(`[UPLOAD] Successfully stored file with hash: ${hash}`);

      // 2. Save metadata in our DB
      const videoData = insertVideoSchema.parse({
        title: cleanTitle(title),
        description,
        category: category || "Cinema",
        hash,
      });

      const video = await storage.createVideo(videoData, (req as any).user?.id);
      res.status(201).json(video);
    } catch (error: any) {
      console.error("[UPLOAD ERROR]", error.response?.data || error.message);
      if (error instanceof z.ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        res.status(500).json({ message: "Upload failed: " + (error.response?.data?.error || error.message) });
      }
    }
  });

  app.delete("/api/videos/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteVideo(req.params.id);
      if (success) res.json({ success: true });
      else res.status(404).json({ message: "Video not found" });
    } catch (error: any) {
      res.status(500).json({ message: "Delete failed" });
    }
  });

  app.patch("/api/videos/bulk", requireAuth, async (req, res) => {
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

  // 🚀 Immediate Startup Sync
  // Runs once when the server starts to clean titles and discover new videos
  syncVideosWithStorage().catch(err => console.error("[STARTUP SYNC ERROR]", err.message));

  const httpServer = createServer(app);
  return httpServer;
}
