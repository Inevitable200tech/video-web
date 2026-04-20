import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import {
  insertVideoSchema,
  insertUserSchema,
  insertCommentSchema,
  VideoModel,
} from "@shared/schema";
import { z } from "zod";
import jwt from "jsonwebtoken";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const rootEnvPath = path.resolve("cert.env");
const folderEnvPath = path.resolve("cert_env", "cert.env");
export const envPath = fs.existsSync(rootEnvPath) ? rootEnvPath : folderEnvPath;
dotenv.config({ path: envPath });

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "password";
const STORAGE_API_URL = process.env.STORAGE_API_URL || "http://localhost:3000";
const STORAGE_API_TOKEN = process.env.STORAGE_API_TOKEN || "";

// Increased file size limit to 2GB to match the frontend and storage requirements
export const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } 
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.adminToken || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({ message: "Invalid session" });
  }
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth Routes
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = jwt.sign({ username, role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
      res.cookie("adminToken", token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
      });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
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

  async function syncVideosWithStorage() {
    if (Date.now() - lastSyncTime < SYNC_COOLDOWN) return;
    if (!STORAGE_API_URL || !STORAGE_API_TOKEN) return;

    try {
      lastSyncTime = Date.now();
      console.log("[SYNC] Starting background video synchronization and title cleaning...");

      // 0. Clean existing titles in DB (One-time check per sync)
      const targetPhrase = "Desi new videoz hd / sd - DropMMS Unblock";
      await VideoModel.updateMany(
        { title: { $regex: targetPhrase } },
        [{ $set: { title: { $trim: { input: { $replaceOne: { input: "$title", find: ` - ${targetPhrase}`, replacement: "" } } } } } }]
      );
      await VideoModel.updateMany(
        { title: { $regex: targetPhrase } },
        [{ $set: { title: { $trim: { input: { $replaceOne: { input: "$title", find: targetPhrase, replacement: "" } } } } } }]
      );

      const response = await axios.get(`${STORAGE_API_URL}/api/public/files`, {
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
      const { category, q } = req.query;

      const result = await storage.getVideos(category as string, skip, limit, q as string);
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

      // Fetch signed URL from storage API (using hash)
      try {
        console.log(`[STORAGE] Fetching signed URL for hash: ${hash}`);
        const response = await axios.get(`${STORAGE_API_URL}/api/public/file/${hash}`, {
          headers: { "Authorization": `Bearer ${STORAGE_API_TOKEN}` },
          timeout: 5000
        });
        
        if (response.data.success) {
          await storage.incrementViews(hash);
          res.json({
            ...video,
            playbackUrl: response.data.download.url,
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
      
      const storageRes = await axios.post(`${STORAGE_API_URL}/api/upload`, formData, {
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
      const comment = await storage.createComment(data, (req as any).user.id);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid comment data" });
    }
  });

  // 🚀 Immediate Startup Sync
  // Runs once when the server starts to clean titles and discover new videos
  syncVideosWithStorage().catch(err => console.error("[STARTUP SYNC ERROR]", err.message));

  const httpServer = createServer(app);
  return httpServer;
}
