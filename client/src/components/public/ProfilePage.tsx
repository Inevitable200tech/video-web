import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { User, Eye, Heart, Calendar, Play, Video } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

interface ProfileData {
  id: string;
  username: string;
  bio?: string;
  role: string;
  createdAt: string;
  stats: {
    totalVideos: number;
    totalViews: number;
    totalLikes: number;
  };
  videos: {
    id: string;
    title: string;
    hash: string;
    thumbnailHash?: string;
    views: number;
    likes: number;
    uploadedAt: string;
    category: string;
  }[];
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();

  const { data: profile, isLoading, error } = useQuery<ProfileData>({
    queryKey: [`/api/users/${username}`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${username}`);
      if (!res.ok) throw new Error("User not found");
      return res.json();
    },
    enabled: !!username,
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">User Not Found</h2>
          <p className="text-muted-foreground">This profile doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* ═══ PROFILE HEADER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          {/* Glow */}
          <div className="absolute -inset-8 bg-primary/5 blur-[80px] rounded-full -z-10 pointer-events-none" />

          <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {isLoading ? (
                <Skeleton className="w-24 h-24 rounded-full bg-white/5" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-xl shadow-primary/10">
                  <User className="w-10 h-10 text-primary" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-48 bg-white/5 rounded-xl" />
                  <Skeleton className="h-4 w-64 bg-white/5 rounded-xl" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
                    <h1 className="text-3xl font-bold text-foreground">{profile?.username}</h1>
                    {profile?.role === "admin" && (
                      <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                        Admin
                      </span>
                    )}
                    {currentUser?.username === username && (
                      <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-muted-foreground text-[10px] font-black uppercase tracking-widest rounded-full">
                        You
                      </span>
                    )}
                  </div>

                  {profile?.bio && (
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">{profile.bio}</p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest justify-center sm:justify-start">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {profile?.createdAt && formatDistanceToNow(new Date(profile.createdAt))} ago
                  </div>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="flex sm:flex-col gap-6 sm:gap-4 text-center">
              {isLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="w-20 h-12 bg-white/5 rounded-xl" />)
              ) : (
                <>
                  <div className="space-y-0.5">
                    <p className="text-2xl font-black text-foreground">{profile?.stats.totalVideos ?? 0}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 justify-center"><Video className="w-3 h-3" /> Videos</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-2xl font-black text-foreground">{(profile?.stats.totalViews ?? 0).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 justify-center"><Eye className="w-3 h-3" /> Views</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-2xl font-black text-foreground">{(profile?.stats.totalLikes ?? 0).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 justify-center"><Heart className="w-3 h-3" /> Likes</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* ═══ VIDEOS ═══ */}
        <div>
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Uploaded Videos</h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{profile?.stats.totalVideos ?? 0} total</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="aspect-video rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : profile?.videos.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest">No videos uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {profile?.videos.map((video, i) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/watch/${video.hash}`}>
                    <div className="group cursor-pointer rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.04] transition-all duration-300">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-black overflow-hidden">
                        <img
                          src={video.thumbnailHash || "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=800&auto=format&fit=crop"}
                          alt={video.title}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=800&auto=format&fit=crop";
                          }}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-[9px] font-black uppercase tracking-widest text-white/70">
                          {video.category}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4 space-y-2">
                        <h3 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{video.views.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{video.likes.toLocaleString()}</span>
                          <span className="ml-auto">{formatDistanceToNow(new Date(video.uploadedAt))} ago</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
