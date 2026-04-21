import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { Eye, Calendar, User, Share2, ThumbsUp, Tag, Play, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  description: string;
  hash: string;
  thumbnailHash?: string;
  category: string;
  views: number;
  likes: number;
  uploadedAt: string;
}

interface VideoDetails extends Video {
  playbackUrl: string;
  expiresAt: string;
}

interface VideoResponse {
  videos: Video[];
  total: number;
}

export default function WatchVideo() {
  const { hash } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: video, isLoading, error } = useQuery<VideoDetails>({
    queryKey: [`/api/videos/${hash}`],
    enabled: !!hash,
  });

  const { data: sidebarResponse } = useQuery<VideoResponse>({
    queryKey: ["/api/videos", "sidebar"],
    queryFn: async () => {
      const res = await fetch("/api/videos?limit=10");
      return res.json();
    }
  });

  const sidebarVideos = sidebarResponse?.videos || [];

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/videos/${hash}/like`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to like video");
      return res.json();
    },
    onSuccess: (updatedVideo) => {
      queryClient.setQueryData([`/api/videos/${hash}`], (old: any) => ({
        ...old,
        likes: updatedVideo.likes
      }));
      toast({
        title: "Liked!",
        description: "Video added to top rated section.",
      });
    },
  });

  // Set video source when playbackUrl arrives
  useEffect(() => {
    if (!video?.playbackUrl || !videoRef.current) return;
    const el = videoRef.current;
    el.src = video.playbackUrl;
    el.load();
  }, [video?.playbackUrl]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied!",
      description: "Video link has been copied to your clipboard.",
    });
  };

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Play className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Playback Unavailable</h2>
          <p className="text-muted-foreground">Video not found or storage service is offline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4 lg:px-8">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ═══════════ MAIN CONTENT ═══════════ */}
        <div className="lg:col-span-8 space-y-8">

          {/* Video Player Section */}
          <div className="relative">
            <div className="absolute -inset-8 bg-primary/5 blur-[80px] rounded-full -z-10 animate-glow pointer-events-none" />

            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/5 shadow-2xl">
              {isLoading ? (
                <div className="aspect-video">
                  <Skeleton className="w-full h-full bg-white/5" />
                </div>
              ) : (
                <div className="relative aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain bg-black"
                    playsInline
                    controls
                    preload="metadata"
                    controlsList="nodownload"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {!isPlaying && video?.playbackUrl && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer z-10 transition-opacity duration-300"
                      onClick={handlePlay}
                    >
                      <div className="w-20 h-20 rounded-full bg-primary/20 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-white fill-white ml-1" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Video Info */}
          <div className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4 bg-white/5 rounded-xl" />
                <Skeleton className="h-6 w-1/3 bg-white/5 rounded-xl" />
              </div>
            ) : (
              <>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                  {video?.title}
                </h1>

                <div className="flex flex-wrap items-center justify-between gap-6 py-4 border-y border-white/5">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Network Contributor</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Node</p>
                      </div>
                    </div>

                    <div className="h-8 w-[1px] bg-white/5 hidden sm:block" />

                    <div className="flex items-center gap-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" />
                        {(video?.views || 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-500 fill-pink-500/20" />
                        {(video?.likes || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={() => likeMutation.mutate()}
                      disabled={likeMutation.isPending}
                      className="border-white/10 hover:bg-pink-500/10 hover:text-pink-500 hover:border-pink-500/30 font-bold px-6 h-11 rounded-xl transition-all active:scale-95"
                    >
                      <ThumbsUp className={`w-4 h-4 mr-2 ${likeMutation.isPending ? 'animate-bounce' : ''}`} />
                      LIKE
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={handleShare}
                      className="border-white/10 hover:bg-white/5 font-bold px-6 h-11 rounded-xl"
                    >
                      <Share2 className="w-4 h-4 mr-2" /> SHARE
                    </Button>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
                    <Tag className="w-3.5 h-3.5" />
                    {video?.category || "Cinema"} • {video?.uploadedAt && formatDistanceToNow(new Date(video.uploadedAt))} ago
                  </div>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm font-medium">
                    {video?.description || "No description provided for this video."}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══════════ SIDEBAR ═══════════ */}
        <div className="lg:col-span-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-widest">Recommended</h3>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {sidebarVideos?.length || 0} discovered
              </span>
            </div>

            <div className="space-y-4">
              {sidebarVideos?.filter(v => v.hash !== hash).slice(0, 15).map((v) => (
                <Link key={v.id} href={`/watch/${v.hash}`}>
                  <div className="flex gap-4 group cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-all">
                    <div className="w-32 sm:w-40 aspect-video bg-black rounded-lg flex-shrink-0 relative overflow-hidden border border-white/5 group-hover:border-primary/50 transition-colors">
                      <img
                        src={v.thumbnailHash || "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop"}
                        alt={v.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop";
                        }}
                        loading="lazy"
                      />
                      <Play className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white fill-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300" />
                    </div>

                    <div className="flex-1 min-w-0 py-0.5">
                      <h4 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">
                        {v.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <span>{(v.views || 0).toLocaleString()} views</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(v.uploadedAt))} ago</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
