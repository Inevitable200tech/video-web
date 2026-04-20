import mongoose, { Model } from "mongoose";
import {
  type User,
  type InsertUser,
  type Video,
  type InsertVideo,
  type Comment,
  type InsertComment,
  UserModel,
  VideoModel,
  CommentModel,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;

  // Video operations
  getVideos(category?: string, skip?: number, limit?: number): Promise<{ videos: Video[], total: number }>;
  getVideoByHash(hash: string): Promise<Video | null>;
  getVideoById(id: string): Promise<Video | null>;
  createVideo(video: InsertVideo, userId?: string): Promise<Video>;
  incrementViews(hash: string): Promise<Video | null>;
  deleteVideo(id: string): Promise<boolean>;

  // Comment operations
  getComments(videoId: string): Promise<Comment[]>;
  createComment(comment: InsertComment, userId: string): Promise<Comment>;
}

export class MongoStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | null> {
    return await UserModel.findById(id).lean().exec() as User | null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return await UserModel.findOne({ username }).lean().exec() as User | null;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = await UserModel.create(insertUser);
    return user.toObject() as User;
  }

  // Video operations
  async getVideos(category?: string, skip: number = 0, limit: number = 20): Promise<{ videos: Video[], total: number }> {
    const query = category ? { category } : {};
    const [docs, total] = await Promise.all([
      VideoModel.find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      VideoModel.countDocuments(query).exec()
    ]);

    const videos = docs.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as Video[];
    return { videos, total };
  }

  async getVideoByHash(hash: string): Promise<Video | null> {
    const doc = await VideoModel.findOne({ hash }).lean().exec();
    if (!doc) return null;
    return { ...doc, id: (doc as any)._id.toString() } as unknown as Video;
  }

  async getVideoById(id: string): Promise<Video | null> {
    const doc = await VideoModel.findById(id).lean().exec();
    if (!doc) return null;
    return { ...doc, id: (doc as any)._id.toString() } as unknown as Video;
  }

  async createVideo(insertVideo: InsertVideo, userId?: string): Promise<Video> {
    const video = await VideoModel.create({
      ...insertVideo,
      uploadedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });
    return video.toObject() as Video;
  }

  async incrementViews(hash: string): Promise<Video | null> {
    const doc = await VideoModel.findOneAndUpdate(
      { hash },
      { $inc: { views: 1 } },
      { new: true }
    ).lean().exec();
    if (!doc) return null;
    return { ...doc, id: (doc as any)._id.toString() } as unknown as Video;
  }

  async deleteVideo(id: string): Promise<boolean> {
    const result = await VideoModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  // Comment operations
  async getComments(videoId: string): Promise<Comment[]> {
    const docs = await CommentModel.find({ videoId: new mongoose.Types.ObjectId(videoId) })
      .sort({ createdAt: -1 })
      .populate("userId", "username avatarHash")
      .lean()
      .exec();
    return docs.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as Comment[];
  }

  async createComment(insertComment: InsertComment, userId: string): Promise<Comment> {
    const comment = await CommentModel.create({
      videoId: new mongoose.Types.ObjectId(insertComment.videoId),
      userId: new mongoose.Types.ObjectId(userId),
      text: insertComment.text,
    });
    return comment.toObject() as Comment;
  }
}

export const storage = new MongoStorage();
