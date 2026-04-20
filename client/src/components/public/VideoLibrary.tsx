import { useQuery } from "@tanstack/react-query";
import { Link, useSearch, useLocation } from "wouter";
import { Play, Eye, Clock, Search, TrendingUp, Heart, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";

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

interface VideoResponse {
  videos: Video[];
  total: number;
}

export default function VideoLibrary() {
  const searchStr = useSearch();
  const [_, navigate] = useLocation();
  const searchQuery = new URLSearchParams(searchStr).get("q") || "";
  const activeSort = new URLSearchParams(searchStr).get("sortBy") || "newest";
  const [page, setPage] = useState(1);
  const limit = 12;

  // Reset to page 1 when search query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeSort]);

  // Main Query for the grid
  const { data: mainData, isLoading: isMainLoading } = useQuery<VideoResponse>({
    queryKey: ["/api/videos", page, searchQuery, activeSort],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        page: String(page), 
        limit: String(limit),
        sortBy: activeSort 
      });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const res = await fetch(`/api/videos?${params}`);
      return res.json();
    },
  });

  // Category specific queries for the Cinema Home view
  const { data: trendingData } = useQuery<VideoResponse>({
    queryKey: ["/api/videos", "trending"],
    queryFn: async () => {
      const res = await fetch(`/api/videos?limit=4&sortBy=views`);
      return res.json();
    },
    enabled: page === 1 && !searchQuery,
  });

  const { data: newestData } = useQuery<VideoResponse>({
    queryKey: ["/api/videos", "newest"],
    queryFn: async () => {
      const res = await fetch(`/api/videos?limit=4&sortBy=newest`);
      return res.json();
    },
    enabled: page === 1 && !searchQuery,
  });

  const { data: bestData } = useQuery<VideoResponse>({
    queryKey: ["/api/videos", "best"],
    queryFn: async () => {
      const res = await fetch(`/api/videos?limit=4&sortBy=likes`);
      return res.json();
    },
    enabled: page === 1 && !searchQuery,
  });

  const videos = mainData?.videos || [];
  const total = mainData?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const isSearching = searchQuery.trim().length > 0;
  const isCinemaView = page === 1 && !isSearching && activeSort === "newest";

  const VideoCard = ({ video, showLikes = false }: { video: Video, showLikes?: boolean }) => (
    <Link href={`/watch/${video.hash}`}>
      <div className="group flex flex-col cursor-pointer">
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-4 bg-black border border-white/5 shadow-lg transition-transform duration-300 hover:-translate-y-1">
          <img
            src={video.thumbnailHash || "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop"}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop";
            }}
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-2xl">
              <Play className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
              {video.category}
            </Badge>
          </div>
        </div>

        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        
        <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {(video.views || 0).toLocaleString()}
          </span>
          {showLikes && (
            <span className="flex items-center gap-1 text-pink-500">
              <Heart className="w-3 h-3 fill-pink-500" />
              {(video.likes || 0).toLocaleString()}
            </span>
          )}
          <span>•</span>
          <span>{formatDistanceToNow(new Date(video.uploadedAt))} ago</span>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background pt-12 pb-24 px-4 sm:px-8">
      <main className="max-w-[1400px] mx-auto">
        
        {isCinemaView ? (
          <div className="space-y-20">
            {/* Most Viewed Section */}
            <section>
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <Flame className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold tracking-tight">Most Viewed</h2>
                </div>
                <Link href="/?sortBy=views">
                  <button className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors">
                    View All
                  </button>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {trendingData?.videos.map((v) => <VideoCard key={v.id} video={v} />)}
                {!trendingData && [...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-[16/9] rounded-2xl bg-white/5" />)}
              </div>
            </section>

            {/* Newest Section */}
            <section>
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-bold tracking-tight">Recently Added</h2>
                </div>
                <Link href="/?sortBy=newest">
                  <button className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors">
                    View All
                  </button>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {newestData?.videos.map((v) => <VideoCard key={v.id} video={v} />)}
                {!newestData && [...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-[16/9] rounded-2xl bg-white/5" />)}
              </div>
            </section>

            {/* Best Section */}
            <section>
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-pink-400" />
                  <h2 className="text-xl font-bold tracking-tight">Top Rated</h2>
                </div>
                <Link href="/?sortBy=likes">
                  <button className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors">
                    View All
                  </button>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {bestData?.videos.map((v) => <VideoCard key={v.id} video={v} showLikes />)}
                {!bestData && [...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-[16/9] rounded-2xl bg-white/5" />)}
              </div>
            </section>
          </div>
        ) : (
          <>
            <header className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2 uppercase">
                  {isSearching ? `Search: ${searchQuery}` : activeSort}
                </h1>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  {isMainLoading ? "Loading..." : `${total} videos found`}
                </p>
              </div>
              
              {!isSearching && (
                <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                  {["newest", "views", "likes"].map((sort) => (
                    <button
                      key={sort}
                      onClick={() => navigate(`/?sortBy=${sort}`)}
                      className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                        activeSort === sort ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {sort}
                    </button>
                  ))}
                </div>
              )}
            </header>

            {isMainLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="aspect-[16/9] rounded-2xl bg-white/5" />
                    <Skeleton className="h-6 w-3/4 bg-white/5" />
                    <Skeleton className="h-4 w-1/2 bg-white/5" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 mb-16">
                  {videos.map((video) => (
                    <VideoCard key={video.id} video={video} showLikes={activeSort === "likes"} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={`
                        w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 transition-all
                        ${page === 1 ? "opacity-20 cursor-not-allowed" : "hover:bg-white hover:text-black"}
                      `}
                    >
                      Prev
                    </button>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className={`
                        w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 transition-all
                        ${page === totalPages ? "opacity-20 cursor-not-allowed" : "hover:bg-white hover:text-black"}
                      `}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!isMainLoading && videos.length === 0 && !isCinemaView && (
          <div className="text-center py-40 border border-white/5 rounded-3xl bg-white/[0.02]">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No results found</h2>
            <p className="text-muted-foreground text-sm mb-8">Try adjusting your search or filters.</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform"
            >
              Reset All
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
