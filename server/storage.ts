import mongoose from "mongoose";
import {
  type User,
  type InsertUser,
  type Video,
  type InsertVideo,
  type Comment,
  type InsertComment,
  type Source,
  type InsertSource,
  type OTP,
  type BlacklistedVideo,
  type SecondaryDatabase,
} from "@shared/schema";
import { getModels } from "./db";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | null>;
  getUserByExternalId(externalId: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;

  // OTP operations
  createOTP(email: string, code: string): Promise<OTP>;
  getOTP(email: string, code: string): Promise<OTP | null>;
  deleteOTP(email: string): Promise<void>;

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
  // Blacklist operations
  isBlacklisted(hash: string): Promise<boolean>;
  getBlacklist(): Promise<BlacklistedVideo[]>;
  removeFromBlacklist(hash: string): Promise<boolean>;
}

export class MongoStorage implements IStorage {
  private get models() {
    return getModels();
  }

  // User operations
  async getUser(id: string): Promise<User | null> {
    return await this.models.UserModel.findById(id).lean().exec() as User | null;
  }

  async getUserByExternalId(externalId: string): Promise<User | null> {
    return await this.models.UserModel.findOne({ externalId }).lean().exec() as User | null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return await this.models.UserModel.findOne({ username }).lean().exec() as User | null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.models.UserModel.findOne({ email }).lean().exec() as User | null;
  }

  async getUsers(): Promise<User[]> {
    const docs = await this.models.UserModel.find().sort({ createdAt: -1 }).lean().exec();
    return docs.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as User[];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = await this.models.UserModel.create(insertUser);
    return user.toObject() as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const doc = await this.models.UserModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean().exec();
    if (!doc) return null;
    return { ...doc, id: (doc as any)._id.toString() } as unknown as User;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.models.UserModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  // Video operations (Multi-DB Aggregation)
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

    // Parallel fetch from ALL databases
    const results = await Promise.all(this.models.AllVideoModels.map(async (model) => {
      const [docs, total] = await Promise.all([
        model.find(query).sort(sortObj).lean().exec(),
        model.countDocuments(query).exec()
      ]);
      return { docs, total };
    }));

    // Aggregate and manually sort/slice for pagination
    // Note: In a massive scale, this would be slow. For "n" instances of 512MB, it's fine.
    const allDocs = results.flatMap(r => r.docs);
    const total = results.reduce((acc, r) => acc + r.total, 0);

    // Manual Sort
    allDocs.sort((a: any, b: any) => {
      if (sortBy === "views") return (b.views || 0) - (a.views || 0);
      if (sortBy === "likes") return (b.likes || 0) - (a.likes || 0);
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });

    const paginated = allDocs.slice(skip, skip + limit);
    const videos = paginated.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as Video[];

    return { videos, total };
  }

  async getVideoByHash(hash: string): Promise<Video | null> {
    // Search across all DBs
    for (const model of this.models.AllVideoModels) {
      const doc = await model.findOne({ hash }).lean().exec();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as Video;
    }
    return null;
  }

  async getVideoById(id: string): Promise<Video | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    for (const model of this.models.AllVideoModels) {
      const doc = await model.findById(id).lean().exec();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as Video;
    }
    return null;
  }

  async getVideosByUser(userId: string): Promise<Video[]> {
    const results = await Promise.all(this.models.AllVideoModels.map(model => 
      model.find({ uploadedBy: new mongoose.Types.ObjectId(userId) })
        .sort({ uploadedAt: -1 })
        .lean()
        .exec()
    ));
    const allDocs = results.flatMap(r => r);
    return allDocs.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as Video[];
  }

  async createVideo(insertVideo: InsertVideo, userId?: string): Promise<Video> {
    // WRITES always go to the WriteVideoModel (The newest secondary instance)
    const video = await this.models.WriteVideoModel.create({
      ...insertVideo,
      uploadedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });
    return video.toObject() as Video;
  }

  async incrementViews(hash: string): Promise<Video | null> {
    for (const model of this.models.AllVideoModels) {
      const doc = await model.findOneAndUpdate(
        { hash },
        { $inc: { views: 1 } },
        { new: true }
      ).lean().exec();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as Video;
    }
    return null;
  }

  async incrementLikes(hash: string): Promise<Video | null> {
    for (const model of this.models.AllVideoModels) {
      const doc = await model.findOneAndUpdate(
        { hash },
        { $inc: { likes: 1 } },
        { new: true }
      ).lean().exec();
      if (doc) return { ...doc, id: (doc as any)._id.toString() } as unknown as Video;
    }
    return null;
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
      
      // Look in all DBs for the top video
      const allTop = await Promise.all(this.models.AllVideoModels.map(model => 
        model.findOne(filter).sort({ views: -1, likes: -1, uploadedAt: -1 }).lean().exec()
      ));
      
      const validTops = allTop.filter(v => !!v);
      validTops.sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
      
      const topVideo = validTops[0] as any;
      if (topVideo && topVideo.thumbnailHash) {
        results[cat.name] = topVideo.thumbnailHash;
      }
    }));
    
    return results;
  }

  async deleteVideo(id: string): Promise<boolean> {
    let video = null;
    let activeModel = null;
    
    for (const model of this.models.AllVideoModels) {
      video = await model.findById(id).exec();
      if (video) {
        activeModel = model;
        break;
      }
    }
    
    if (!video || !activeModel) return false;
    
    // Add to blacklist so it's never re-added via sync
    // Blacklist also goes to the "Write" DB
    await this.models.WriteBlacklistModel.create({ 
      hash: video.hash,
      title: (video as any).title,
      thumbnailHash: (video as any).thumbnailHash,
      reason: `Deleted by admin at ${new Date().toISOString()}` 
    }).then(() => {
      console.log(`[BLACKLIST] Successfully blacklisted hash: ${video?.hash}`);
    }).catch(err => {
      if (err.code !== 11000) console.error("[BLACKLIST ERROR]", err);
    });

    const result = await activeModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async isBlacklisted(hash: string): Promise<boolean> {
    for (const model of this.models.AllBlacklistModels) {
      const count = await model.countDocuments({ hash }).exec();
      if (count > 0) return true;
    }
    return false;
  }

  async getBlacklist(): Promise<BlacklistedVideo[]> {
    const results = await Promise.all(this.models.AllBlacklistModels.map(model => 
      model.find().sort({ createdAt: -1 }).lean().exec()
    ));
    const allDocs = results.flatMap(r => r);
    return allDocs.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as BlacklistedVideo[];
  }

  async removeFromBlacklist(hash: string): Promise<boolean> {
    let deleted = false;
    for (const model of this.models.AllBlacklistModels) {
      const result = await model.deleteOne({ hash }).exec();
      if (result.deletedCount > 0) deleted = true;
    }
    return deleted;
  }

  async bulkUpdateVideos(ids: string[], updates: Partial<Video>): Promise<number> {
    let totalModified = 0;
    const objIds = ids.map(id => new mongoose.Types.ObjectId(id));
    
    for (const model of this.models.AllVideoModels) {
      const result = await model.updateMany(
        { _id: { $in: objIds } },
        { $set: updates }
      ).exec();
      totalModified += result.modifiedCount;
    }
    return totalModified;
  }

  // Comment operations
  async getComments(videoId: string): Promise<Comment[]> {
    if (!mongoose.Types.ObjectId.isValid(videoId)) return [];
    const objId = new mongoose.Types.ObjectId(videoId);

    const results = await Promise.all(this.models.AllCommentModels.map(async (model) => {
      try {
        return await model
          .find({ videoId: objId })
          .sort({ createdAt: -1 })
          .populate("userId", "username avatarHash")
          .lean()
          .exec();
      } catch {
        // If populate fails on a secondary (e.g. no matching user data), fall back without it
        return await model.find({ videoId: objId }).sort({ createdAt: -1 }).lean().exec();
      }
    }));

    const allDocs = results.flatMap(r => r);

    // Deduplicate by _id in case a comment exists in multiple DB instances
    const seen = new Set<string>();
    const unique = allDocs.filter((doc: any) => {
      const id = doc._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    return unique.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as Comment[];
  }

  async createComment(insertComment: InsertComment, userId: string): Promise<Comment> {
    const comment = await this.models.WriteCommentModel.create({
      videoId: new mongoose.Types.ObjectId(insertComment.videoId),
      userId: new mongoose.Types.ObjectId(userId),
      text: insertComment.text,
    });
    return comment.toObject() as Comment;
  }

  // Source operations
  async getSources(activeOnly: boolean = false): Promise<Source[]> {
    const query = activeOnly ? { isActive: true } : {};
    const docs = await this.models.SourceModel.find(query).sort({ createdAt: -1 }).lean().exec();
    return docs.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as Source[];
  }

  async createSource(insertSource: InsertSource): Promise<Source> {
    const source = await this.models.SourceModel.create(insertSource);
    return { ...source.toObject(), id: source._id.toString() } as unknown as Source;
  }

  async updateSource(id: string, updates: Partial<Source>): Promise<Source | null> {
    const doc = await this.models.SourceModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean().exec();
    if (!doc) return null;
    return { ...doc, id: (doc as any)._id.toString() } as unknown as Source;
  }

  async deleteSource(id: string): Promise<boolean> {
    const result = await this.models.SourceModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  // OTP operations
  async createOTP(email: string, code: string): Promise<OTP> {
    await this.models.OTPModel.deleteMany({ email });
    const otp = await this.models.OTPModel.create({ email, code });
    return otp.toObject() as OTP;
  }

  async getOTP(email: string, code: string): Promise<OTP | null> {
    return await this.models.OTPModel.findOne({ email, code }).lean().exec() as OTP | null;
  }

  async deleteOTP(email: string): Promise<void> {
    await this.models.OTPModel.deleteMany({ email }).exec();
  }

  // Secondary Database management
  async getSecondaryDatabases(): Promise<SecondaryDatabase[]> {
    const docs = await this.models.SecondaryDatabaseModel.find().sort({ createdAt: -1 }).lean().exec();
    return docs.map(doc => ({ ...doc, id: (doc as any)._id.toString() })) as unknown as SecondaryDatabase[];
  }

  async createSecondaryDatabase(insert: any): Promise<SecondaryDatabase> {
    const db = await this.models.SecondaryDatabaseModel.create(insert);
    return { ...db.toObject(), id: db._id.toString() } as unknown as SecondaryDatabase;
  }

  async deleteSecondaryDatabase(id: string): Promise<boolean> {
    const result = await this.models.SecondaryDatabaseModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export const storage = new MongoStorage();
