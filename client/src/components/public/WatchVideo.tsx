import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Eye, User, Share2, ThumbsUp, Tag, Play, Heart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import CommentSection from "./CommentSection";
import { useAuth } from "@/hooks/use-auth";
import { SignInButton } from "@clerk/clerk-react"; // Ensure you have this installed

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

interface PlaybackData {
  playbackUrl: string;
  expiresAt: number;
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
  const { user } = useAuth();
  const [showLoginWall, setShowLoginWall] = useState(false);

  // 1. Improved check to trigger the wall
  const checkLoginWall = () => {
    if (user || !videoRef.current) return;
    const el = videoRef.current;
    if (el.duration && (el.currentTime / el.duration) >= 0.5) {
      el.pause();
      // We clear the src to prevent tech-savvy users from inspecting and resuming
      el.removeAttribute("src");
      el.load(); 
      setShowLoginWall(true);
      setIsPlaying(false);
    }
  };

  const { data: video, isLoading: metadataLoading, error: metadataError } = useQuery<Video>({
    queryKey: [`/api/videos/${hash}`],
    queryFn: async () => {
      const res = await fetch(`/api/videos/${hash}`);
      if (!res.ok) throw new Error("Video not found");
      return res.json();
    },
    enabled: !!hash,
  });

  const playbackQuery = useQuery<PlaybackData>({
    queryKey: [`/api/videos/${hash}/playback`],
    queryFn: async () => {
      const res = await fetch(`/api/videos/${hash}/playback`);
      if (!res.ok) throw new Error("Failed to fetch playback URL");
      return (await res.json()) as PlaybackData;
    },
    enabled: !!hash,
    staleTime: 5 * 60 * 1000,
  });

  const playbackData = playbackQuery.data;
  const playbackLoading = playbackQuery.isLoading;

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
      toast({ title: "Liked!", description: "Added to top rated." });
    },
  });

  // 2. Automatically restore video when user logs in
  useEffect(() => {
    if (!playbackData?.playbackUrl || !videoRef.current || (showLoginWall && !user)) return;
    const el = videoRef.current;
    el.src = playbackData.playbackUrl;
    el.load();
    // If they just logged in, hide the wall
    if (user) setShowLoginWall(false);
  }, [playbackData?.playbackUrl, user, showLoginWall]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link Copied!" });
  };

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  if (metadataError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Play className="w-8 h-8 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Playback Unavailable</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4 lg:px-8">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        <div className="lg:col-span-8 space-y-8">
          <div className="relative">
            <div className="absolute -inset-8 bg-primary/5 blur-[80px] rounded-full -z-10 animate-glow" />

            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/5 shadow-2xl">
              {metadataLoading ? (
                <div className="aspect-video"><Skeleton className="w-full h-full bg-white/5" /></div>
              ) : (
                <div className="relative aspect-video">
                  {playbackLoading && !playbackData?.playbackUrl && !showLoginWall && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
                      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest text-white/50">Preparing Stream...</p>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    className={`w-full h-full object-contain bg-black ${showLoginWall ? 'hidden' : 'block'}`}
                    playsInline
                    controls
                    preload="metadata"
                    controlsList="nodownload"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={checkLoginWall}
                    onSeeking={checkLoginWall}
                  />

                  {showLoginWall && !user && (
                    <div 
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30 overflow-hidden animate-in fade-in duration-500"
                      style={{
                        backgroundImage: `url(${video?.thumbnailHash || ''})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />
                      <div className="relative z-10 flex flex-col items-center px-6 text-center">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(59,130,246,0.3)] border border-primary/20">
                          <Lock className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tighter">
                          UNSTABLE CONNECTION? NO, JUST EXCLUSIVE.
                        </h3>
                        <p className="text-white/80 mb-8 max-w-sm text-sm sm:text-base font-medium leading-relaxed">
                          You've watched 50% of this video. Join <span className="text-primary font-bold">our community</span> to finish this video and unlock 1000+ more in Full HD.
                        </p>
                        
                        {/* THE CONVERSION ENGINE: CLERK MODAL */}
                        <SignInButton mode="modal">
                          <Button size="lg" className="font-black tracking-widest uppercase rounded-full px-10 h-16 bg-primary text-primary-foreground shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:shadow-[0_0_60px_rgba(59,130,246,0.6)] hover:scale-105 transition-all">
                            Continue Watching — It's Free
                          </Button>
                        </SignInButton>

                        <div className="mt-8 flex flex-col items-center gap-3">
                           <div className="flex items-center gap-2">
                              <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="w-1/2 h-full bg-primary" />
                              </div>
                              <span className="text-[10px] font-bold text-white/40 uppercase">50% Completed</span>
                           </div>
                           <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">
                             1-Click Google Access • No Credit Card Required
                           </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isPlaying && playbackData?.playbackUrl && !showLoginWall && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer z-10"
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

          <div className="space-y-6">
            {metadataLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4 bg-white/5" />
                <Skeleton className="h-6 w-1/3 bg-white/5" />
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
                        <p className="text-sm font-bold text-foreground">Verified Creator</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Network Contributor</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs font-bold text-muted-foreground uppercase">
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
                    <Button variant="outline" size="sm" onClick={() => likeMutation.mutate()} className="border-white/10 font-bold px-6 h-11 rounded-xl">
                      <ThumbsUp className="w-4 h-4 mr-2" /> LIKE
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShare} className="border-white/10 font-bold px-6 h-11 rounded-xl">
                      <Share2 className="w-4 h-4 mr-2" /> SHARE
                    </Button>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
                    <Tag className="w-3.5 h-3.5" />
                    {video?.category || "General"} • {video?.uploadedAt && formatDistanceToNow(new Date(video.uploadedAt))} ago
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-sm font-medium">
                    {video?.description || "No description provided."}
                  </p>
                </div>

                <CommentSection videoId={video!.id} />
              </>
            )}
          </div>
        </div>

        {/* Sidebar remains the same but with clean UI */}
        <div className="lg:col-span-4">
          <div className="space-y-6">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-widest border-b border-white/5 pb-4">Up Next</h3>
            <div className="space-y-4">
              {sidebarVideos?.filter(v => v.hash !== hash).slice(0, 10).map((v) => (
                <Link key={v.id} href={`/watch/${v.hash}`}>
                  <div className="flex gap-4 group cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-all">
                    <div className="w-32 aspect-video bg-black rounded-lg flex-shrink-0 relative overflow-hidden border border-white/5">
                      <img src={v.thumbnailHash} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground line-clamp-2 leading-snug">{v.title}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">{(v.views || 0).toLocaleString()} views</p>
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