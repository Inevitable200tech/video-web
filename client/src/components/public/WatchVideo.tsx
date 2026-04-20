import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { Eye, Calendar, User, Share2, ThumbsUp, Tag, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";

interface VideoDetails extends Video {
  playbackUrl: string;
  expiresAt: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  hash: string;
  thumbnailHash?: string;
  category: string;
  views: number;
  uploadedAt: string;
}

export default function WatchVideo() {
  const { hash } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

  interface VideoResponse {
    videos: Video[];
    total: number;
  }

  // Set video source when playbackUrl arrives
  useEffect(() => {
    if (!video?.playbackUrl || !videoRef.current) return;
    const el = videoRef.current;
    el.src = video.playbackUrl;
    el.load();
  }, [video?.playbackUrl]);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <Play className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Playback Unavailable</h2>
          <p className="text-gray-500">Video not found or storage service is offline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-8">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ═══════════ MAIN CONTENT ═══════════ */}
        <div className="lg:col-span-8 space-y-8">

          {/* Video Player */}
          <div className="relative">
            {/* Ambient glow behind the player */}
            <div className="absolute -inset-8 bg-cyan-500/5 blur-[80px] rounded-full -z-10 animate-glow pointer-events-none" />

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
                    controlsList="nodownload"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {/* Big Play Button Overlay (before user clicks play) */}
                  {!isPlaying && video?.playbackUrl && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer z-10"
                      onClick={handlePlay}
                    >
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl"
                      >
                        <Play className="w-10 h-10 text-white fill-white ml-1" />
                      </motion.div>
                    </motion.div>
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
                {/* Title */}
                <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white leading-tight">
                  {video?.title}
                </h1>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    {/* Author Pill */}
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-sm font-bold text-white">Network Contributor</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        {video?.views?.toLocaleString() || 0}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {video?.uploadedAt && formatDistanceToNow(new Date(video.uploadedAt))} ago
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl h-10 px-5 font-bold text-xs">
                      <ThumbsUp className="w-4 h-4 mr-2" /> LIKE
                    </Button>
                    <Button size="sm" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl h-10 px-5 font-bold text-xs">
                      <Share2 className="w-4 h-4 mr-2" /> SHARE
                    </Button>
                  </div>
                </div>

                {/* Description Card */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                    <Tag className="w-3 h-3" />
                    {video?.category || "Uncategorized"}
                  </div>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {video?.description || "No description provided for this video."}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══════════ SIDEBAR ═══════════ */}
        <div className="lg:col-span-4">
          <div className="sticky top-28 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black font-display text-base text-white uppercase tracking-tight">Up Next</h3>
              <span className="text-[10px] font-bold text-gray-600 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                {sidebarVideos?.filter(v => v.hash !== hash).length || 0}
              </span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              {sidebarVideos?.filter(v => v.hash !== hash).slice(0, 20).map((v) => (
                <Link key={v.id} href={`/watch/${v.hash}`}>
                  <motion.div
                    whileHover={{ x: 3 }}
                    className="flex gap-3 group cursor-pointer p-2.5 rounded-xl hover:bg-white/5 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="w-40 min-w-[10rem] aspect-video bg-neutral-900 rounded-lg flex-shrink-0 relative overflow-hidden border border-white/5 group-hover:border-cyan-500/40 transition-colors">
                      <img
                        src={v.thumbnailHash || "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop"}
                        alt={v.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop";
                        }}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Play className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white fill-white opacity-0 group-hover:opacity-80 scale-50 group-hover:scale-100 transition-all duration-300" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <h4 className="text-[13px] font-bold text-white line-clamp-2 group-hover:text-cyan-400 transition-colors leading-snug mb-1.5">
                        {v.title}
                      </h4>
                      <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest mb-1">{v.category}</p>
                      <p className="text-[10px] text-gray-600 font-semibold">
                        {v.views.toLocaleString()} views · {formatDistanceToNow(new Date(v.uploadedAt))}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
