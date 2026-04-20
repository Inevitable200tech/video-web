import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Play, Eye, Calendar, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

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

interface VideoResponse {
  videos: Video[];
  total: number;
}

export default function VideoLibrary() {
  const [page, setPage] = useState(1);
  const limit = 12;

  const { data, isLoading } = useQuery<VideoResponse>({
    queryKey: ["/api/videos", page],
    queryFn: async () => {
      const res = await fetch(`/api/videos?page=${page}&limit=${limit}`);
      return res.json();
    },
  });

  const videos = data?.videos || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen pt-24 pb-24 px-4 sm:px-8">
      <header className="max-w-[1400px] mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-6 tracking-widest uppercase"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Live Network
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl sm:text-8xl font-black font-display tracking-tighter leading-tight mb-6"
        >
          UNLIMITED <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">EXPERIENCE</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 text-xl max-w-2xl font-medium leading-relaxed"
        >
          Stream the latest cinematic masterpieces from our global distributed storage network. Fast, secure, and decentralized.
        </motion.p>
      </header>

      <main className="max-w-[1400px] mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[16/9] rounded-2xl bg-white/5" />
                <Skeleton className="h-8 w-3/4 bg-white/5" />
                <Skeleton className="h-4 w-1/2 bg-white/5" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 mb-16">
              <AnimatePresence mode="popLayout">
                {videos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: (index % 4) * 0.05 }}
                  >
                    <Link href={`/watch/${video.hash}`}>
                      <div className="group relative glass-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:ring-2 hover:ring-cyan-500/50 hover:shadow-[0_0_50px_-12px_rgba(34,211,238,0.3)]">
                        {/* Thumbnail Area */}
                        <div className="relative aspect-[16/9] bg-black overflow-hidden">
                          <img
                            src={video.thumbnailHash || "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop"}
                            alt={video.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop";
                            }}
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10 opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
                          <Play className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-white fill-white opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 z-20" />
                          
                          <div className="absolute bottom-4 left-4 z-20">
                            <Badge className="bg-white/10 backdrop-blur-md border-white/10 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                              {video.category}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-6">
                          <h3 className="text-xl font-bold font-display text-white mb-3 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                            {video.title}
                          </h3>
                          
                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {video.views.toLocaleString()}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDistanceToNow(new Date(video.uploadedAt))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`
                    p-4 rounded-2xl glass transition-all
                    ${page === 1 ? "opacity-20 cursor-not-allowed" : "hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] text-white"}
                  `}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - page) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`
                            w-14 h-14 rounded-2xl font-black transition-all
                            ${page === pageNum ? "bg-white text-black shadow-xl scale-110" : "glass text-gray-500 hover:text-white"}
                          `}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (Math.abs(pageNum - page) === 2) {
                      return <span key={pageNum} className="w-10 flex items-end justify-center text-gray-700 font-bold pb-2">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`
                    p-4 rounded-2xl glass transition-all
                    ${page === totalPages ? "opacity-20 cursor-not-allowed" : "hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] text-white"}
                  `}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
          </>
        )}
        
        {!isLoading && videos?.length === 0 && (
          <div className="text-center py-20">
            <Tag className="w-16 h-16 text-gray-800 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-600">No videos found</h2>
            <p className="text-gray-500">Be the first to upload something amazing!</p>
            <Link href="/upload">
              <button className="mt-6 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold transition-colors">
                Upload Now
              </button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
