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
  type Source,
  type InsertSource,
  SourceModel,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;

  // Source operations
  getSources(activeOnly?: boolean): Promise<Source[]>;
  createSource(source: InsertSource): Promise<Source>;
  updateSource(id: string, updates: Partial<Source>): Promise<Source | null>;
  deleteSource(id: string): Promise<boolean>;

  // Video operations
  getVideos(category?: string, skip?: number, limit?: number, q?: string, sortBy?: string): Promise<{ videos: Video[], total: number }>;
  getVideoByHash(hash: string): Promise<Video | null>;
  getVideoById(id: string): Promise<Video | null>;
  getVideosByUser(userId: string): Promise<Video[]>;
  createVideo(video: InsertVideo, userId?: string): Promise<Video>;
  incrementViews(hash: string): Promise<Video | null>;
  incrementLikes(hash: string): Promise<Video | null>;
  getCategoryThumbnails(categories: { name: string, href: string }[]): Promise<Record<string, string>>;
  deleteVideo(id: string): Promise<boolean>;
  bulkUpdateVideos(ids: string[], updates: Partial<Video>): Promise<number>;

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

  async getUsers(): Promise<User[]> {
    const docs = await UserModel.find().sort({ createdAt: -1 }).lean().exec();
    return docs.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as User[];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = await UserModel.create(insertUser);
    return user.toObject() as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const doc = await UserModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean().exec();
    if (!doc) return null;
    return { ...doc, id: (doc as any)._id.toString() } as unknown as User;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  // Video operations
  async getVideos(category?: string, skip: number = 0, limit: number = 20, q?: string, sortBy: string = "newest"): Promise<{ videos: Video[], total: number }> {
    const query: any = {};
    if (category) query.category = category;
    if (q && q.trim()) {
      query.title = { $regex: q.trim(), $options: 'i' };
    }

    let sortObj: any = { uploadedAt: -1, _id: -1 };
    if (sortBy === "views") sortObj = { views: -1, uploadedAt: -1 };
    else if (sortBy === "likes") sortObj = { likes: -1, uploadedAt: -1 };
    else if (sortBy === "trending") sortObj = { views: -1, uploadedAt: -1 };

    const [docs, total] = await Promise.all([
      VideoModel.find(query)
        .sort(sortObj)
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

  async getVideosByUser(userId: string): Promise<Video[]> {
    const docs = await VideoModel.find({ uploadedBy: new mongoose.Types.ObjectId(userId) })
      .sort({ uploadedAt: -1 })
      .lean()
      .exec();
    return docs.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as Video[];
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

  async incrementLikes(hash: string): Promise<Video | null> {
    const doc = await VideoModel.findOneAndUpdate(
      { hash },
      { $inc: { likes: 1 } },
      { new: true }
    ).lean().exec();
    if (!doc) return null;
    return { ...doc, id: (doc as any)._id.toString() } as unknown as Video;
  }

  async getCategoryThumbnails(categories: { name: string, href: string }[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    await Promise.all(categories.map(async (cat) => {
      const urlParams = new URLSearchParams(cat.href.split('?')[1]);
      const category = urlParams.get('category');
      const q = urlParams.get('q');
      
      let filter: any = {};
      if (category) filter.category = category;
      if (q) filter.title = { $regex: q, $options: 'i' };
      
      const topVideo = await VideoModel.findOne(filter)
        .sort({ views: -1, likes: -1, uploadedAt: -1 })
        .lean()
        .exec() as any;
        
      if (topVideo && topVideo.thumbnailHash) {
        results[cat.name] = topVideo.thumbnailHash;
      }
    }));
    
    return results;
  }

  async deleteVideo(id: string): Promise<boolean> {
    const result = await VideoModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async bulkUpdateVideos(ids: string[], updates: Partial<Video>): Promise<number> {
    const result = await VideoModel.updateMany(
      { _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) } },
      { $set: updates }
    ).exec();
    return result.modifiedCount;
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

  // Source operations
  async getSources(activeOnly: boolean = false): Promise<Source[]> {
    const query = activeOnly ? { isActive: true } : {};
    const docs = await SourceModel.find(query).sort({ createdAt: -1 }).lean().exec();
    return docs.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as Source[];
  }

  async createSource(insertSource: InsertSource): Promise<Source> {
    const source = await SourceModel.create(insertSource);
    return { ...source.toObject(), id: source._id.toString() } as unknown as Source;
  }

  async updateSource(id: string, updates: Partial<Source>): Promise<Source | null> {
    const doc = await SourceModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean().exec();
    if (!doc) return null;
    return { ...doc, id: (doc as any)._id.toString() } as unknown as Source;
  }

  async deleteSource(id: string): Promise<boolean> {
    const result = await SourceModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export const storage = new MongoStorage();
