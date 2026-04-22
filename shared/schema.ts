import { z } from "zod";
import mongoose, { Schema, Document } from "mongoose";

// ---------------- USER MANAGEMENT ----------------

export interface User extends Document {
  id: string;
  externalId?: string; // Clerk userId (optional if using internal auth)
  username: string;
  email: string;
  password?: string;
  isVerified: boolean;
  role: "admin" | "user";
  bio?: string;
  avatarHash?: string;
  createdAt: Date;
}

export const userSchema = new Schema<User>({
  externalId: { type: String, unique: true, sparse: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  bio: { type: String },
  avatarHash: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const insertUserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  externalId: z.string().optional(),
  isVerified: z.boolean().default(false),
  role: z.enum(["admin", "user"]).default("user"),
  bio: z.string().max(200).optional(),
});

// ---------------- VIDEO MANAGEMENT ----------------

export interface Video extends Document {
  id: string;
  title: string;
  description: string;
  hash: string; // The unique identifier from linked-lister-api
  thumbnailHash?: string;
  category: string;
  views: number;
  likes: number;
  duration?: number; // in seconds
  uploadedBy?: mongoose.Types.ObjectId;
  sourceId?: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export const videoSchema = new Schema<Video>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  hash: { type: String, required: true, unique: true },
  thumbnailHash: { type: String },
  category: { type: String, required: true },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  duration: { type: Number },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  sourceId: { type: Schema.Types.ObjectId, ref: "Source" },
  uploadedAt: { type: Date, default: Date.now },
});

export const insertVideoSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  hash: z.string().min(1),
  thumbnailHash: z.string().optional(),
  category: z.string().min(1),
  duration: z.number().optional(),
});

// ---------------- COMMENT MANAGEMENT ----------------

export interface Comment extends Document {
  id: string;
  videoId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export const commentSchema = new Schema<Comment>({
  videoId: { type: Schema.Types.ObjectId, ref: "Video", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const insertCommentSchema = z.object({
  videoId: z.string(),
  text: z.string().min(1).max(500),
});

// ---------------- SOURCES MANAGEMENT ----------------

export interface Source extends Document {
  id: string;
  name: string;
  url: string;
  token?: string;
  isActive: boolean;
  lastSync?: Date;
  createdAt: Date;
}

export const sourceSchema = new Schema<Source>({
  name: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  token: { type: String },
  isActive: { type: Boolean, default: true },
  lastSync: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const insertSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  token: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ---------------- OTP MANAGEMENT ----------------

export interface OTP extends Document {
  email: string;
  code: string;
  createdAt: Date;
}

export const otpSchema = new Schema<OTP>({
  email: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // Expires in 10 minutes
});

// ---------------- BLACKLIST MANAGEMENT ----------------

export interface BlacklistedVideo extends Document {
  hash: string;
  title?: string;
  thumbnailHash?: string;
  reason?: string;
  createdAt: Date;
}

export const blacklistedVideoSchema = new Schema<BlacklistedVideo>({
  hash: { type: String, required: true, unique: true },
  title: { type: String },
  thumbnailHash: { type: String },
  reason: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// ---------------- EXPORT MODELS ----------------

export interface SecondaryDatabase extends Document {
  name: string;
  url: string;
  isActive: boolean;
  createdAt: Date;
}

export const secondaryDatabaseSchema = new Schema<SecondaryDatabase>({
  name: { type: String, required: true },
  url: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// ---------------- EXPORT MODELS ----------------

// We'll export the schemas so they can be bound to different connections if needed
export const models = {
  User: userSchema,
  Video: videoSchema,
  Comment: commentSchema,
  Source: sourceSchema,
  OTP: otpSchema,
  BlacklistedVideo: blacklistedVideoSchema,
  SecondaryDatabase: secondaryDatabaseSchema,
};

// Default models (using default mongoose connection)
export const UserModel = (mongoose.models && mongoose.models.User) || mongoose.model<User>("User", userSchema);
export const VideoModel = (mongoose.models && mongoose.models.Video) || mongoose.model<Video>("Video", videoSchema);
export const CommentModel = (mongoose.models && mongoose.models.Comment) || mongoose.model<Comment>("Comment", commentSchema);
export const SourceModel = (mongoose.models && mongoose.models.Source) || mongoose.model<Source>("Source", sourceSchema);
export const OTPModel = (mongoose.models && mongoose.models.OTP) || mongoose.model<OTP>("OTP", otpSchema);
export const BlacklistedVideoModel = (mongoose.models && mongoose.models.BlacklistedVideo) || mongoose.model<BlacklistedVideo>("BlacklistedVideo", blacklistedVideoSchema);
export const SecondaryDatabaseModel = (mongoose.models && mongoose.models.SecondaryDatabase) || mongoose.model<SecondaryDatabase>("SecondaryDatabase", secondaryDatabaseSchema);

// Types for insertion
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertSource = z.infer<typeof insertSourceSchema>;