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

  // Video Routes
  app.get("/api/videos", async (req, res) => {
    try {
      // 1. Optional Auto-Sync from Storage API
      if (STORAGE_API_URL && STORAGE_API_TOKEN) {
        try {
          const response = await axios.get(`${STORAGE_API_URL}/api/public/files`, {
            headers: { "Authorization": `Bearer ${STORAGE_API_TOKEN}` },
            timeout: 5000
          });

          if (response.data.success && Array.isArray(response.data.files)) {
            const files = response.data.files;
            
            // Batch find existing hashes to reduce DB queries
            const existingVideos = await VideoModel.find({ 
              hash: { $in: files.map((f: any) => f.hash) } 
            }).select('hash');
            const existingHashes = new Set(existingVideos.map((v: any) => v.hash));

            const newVideos = files.filter((f: any) => !existingHashes.has(f.hash));
            const videosToUpdate = files.filter((f: any) => existingHashes.has(f.hash) && f.thumbnail_address);

            if (newVideos.length > 0) {
              console.log(`[SYNC] Found ${newVideos.length} new videos in storage API`);
              const videoDocs = newVideos.map((f: any) => ({
                title: f.title || f.filename,
                description: "Auto-discovered from storage network.",
                hash: f.hash,
                thumbnailHash: f.thumbnail_address,
                category: "Cinema",
                uploadedAt: f.created_at || new Date()
              }));
              await VideoModel.insertMany(videoDocs);
            }

            if (videosToUpdate.length > 0) {
              for (const v of videosToUpdate) {
                await VideoModel.updateOne(
                  { hash: v.hash, $or: [{ thumbnailHash: null }, { thumbnailHash: "" }] },
                  { $set: { thumbnailHash: v.thumbnail_address } }
                );
              }
            }
          }
        } catch (syncErr: any) {
          console.warn("[SYNC WARNING] Failed to connect to storage API for discovery:", syncErr.message);
        }
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const { category } = req.query;

      const result = await storage.getVideos(category as string, skip, limit);
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
        title,
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

  const httpServer = createServer(app);
  return httpServer;
}
