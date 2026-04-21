import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Video as VideoIcon, ExternalLink, BarChart3, Users, Settings, Edit3, CheckSquare, Square, X, Search, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import axios from "axios";
import { useState, useEffect } from "react";

// Set CSRF header and credentials for all axios requests in this component
axios.defaults.headers.common['X-Requested-With'] = 'VideoPortal-App';
axios.defaults.withCredentials = true;

interface Video {
  id: string;
  title: string;
  hash: string;
  thumbnailHash?: string;
  views: number;
  category: string;
  uploadedAt: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [titlePattern, setTitlePattern] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [previewVideoHash, setPreviewVideoHash] = useState<string | null>(null);
  const limit = 10;

  // Fetch individual video details for playback
  const { data: previewVideo, isLoading: isPreviewLoading } = useQuery<{ playbackUrl: string, title: string }>({
    queryKey: [`/api/videos/${previewVideoHash}`],
    enabled: !!previewVideoHash,
  });

  const { data: response, isLoading } = useQuery<{ videos: Video[], total: number }>({
    queryKey: ["/api/videos", "admin", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set("q", search);
      const res = await fetch(`/api/videos?${params.toString()}`);
      return res.json();
    }
  });

  const videos = response?.videos || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Reset to page 1 on search
  useEffect(() => {
    setPage(1);
  }, [search]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/videos/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Video deleted" });
      setSelectedIds(prev => prev.filter(sid => sid !== selectedIds[0]));
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: () => {
      toast({ title: "Delete failed", variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { ids: string[], titlePattern: string }) => {
      await axios.patch("/api/videos/bulk", data);
    },
    onSuccess: () => {
      toast({ title: "Bulk update successful" });
      setIsBulkEditDialogOpen(false);
      setSelectedIds([]);
      setTitlePattern("");
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: () => {
      toast({ title: "Bulk update failed", variant: "destructive" });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === videos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(videos.map(v => v.id));
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8">
      <div className="max-w-[1400px] mx-auto space-y-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight text-white mb-2">CONTROL <span className="text-cyan-400">CENTER</span></h1>
            <p className="text-gray-500 font-semibold tracking-widest uppercase text-xs">Managing distributed content nodes</p>
          </div>
          <div className="flex gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
              <Input 
                placeholder="Quick search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl pl-11 pr-4 h-12 w-64 text-white placeholder:text-gray-600 focus:border-cyan-500/50 transition-all"
              />
            </div>
            <Button className="glass bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20 font-bold px-6 h-12 rounded-xl">
              <Settings className="w-4 h-4 mr-2" /> SYSTEM CONFIG
            </Button>
          </div>
        </header>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass border-cyan-500/30 p-6 rounded-2xl flex items-center justify-between sticky top-24 z-40 shadow-2xl shadow-cyan-500/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-white">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-white font-bold">{selectedIds.length} items selected</div>
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Ready for batch operations</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl px-6">
                      <Edit3 className="w-4 h-4 mr-2" /> RENAME SERIES
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass border-white/10 bg-gray-900/95 backdrop-blur-2xl text-white">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black font-display">BULK <span className="text-cyan-400">RENAME</span></DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="pattern" className="text-xs font-bold uppercase tracking-widest text-gray-400">Title Pattern</Label>
                        <Input 
                          id="pattern"
                          placeholder="Example: Wildlife Documentary Part {n}"
                          value={titlePattern}
                          onChange={(e) => setTitlePattern(e.target.value)}
                          className="bg-white/5 border-white/10 rounded-xl h-12 text-white placeholder:text-gray-600"
                        />
                        <p className="text-[10px] text-gray-500 font-medium">Use <span className="text-cyan-400 font-bold">{'{n}'}</span> to automatically insert an incrementing number.</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="ghost" 
                        onClick={() => setIsBulkEditDialogOpen(false)}
                        className="text-gray-400 font-bold"
                      >
                        CANCEL
                      </Button>
                      <Button 
                        onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, titlePattern })}
                        disabled={!titlePattern.trim()}
                        className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl px-8"
                      >
                        APPLY TO {selectedIds.length} VIDEOS
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedIds([])}
                  className="w-10 h-10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <VideoIcon className="w-20 h-20 text-white" />
            </div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Library Reach</div>
            <div className="text-5xl font-black font-display text-white">{total.toLocaleString()}</div>
          </div>
          
          <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BarChart3 className="w-20 h-20 text-white" />
            </div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Network Views</div>
            <div className="text-5xl font-black font-display text-white">
              {videos?.reduce((acc, v) => acc + v.views, 0).toLocaleString() || 0}
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-20 h-20 text-white" />
            </div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Active Sessions</div>
            <div className="text-5xl font-black font-display text-white">1</div>
          </div>
        </div>

        {/* Video Table */}
        <div className="glass rounded-3xl overflow-hidden border-white/5">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-2xl font-black font-display">CONTENT <span className="text-cyan-400">MANAGEMENT</span></h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Select All</span>
              <Checkbox 
                checked={selectedIds.length === videos.length && videos.length > 0}
                onCheckedChange={toggleSelectAll}
                className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
            </div>
          </div>
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="w-[50px] px-8 py-4"></TableHead>
                <TableHead className="text-gray-400 px-8 py-4 font-bold uppercase tracking-widest text-[10px]">Preview</TableHead>
                <TableHead className="text-gray-400 px-8 py-4 font-bold uppercase tracking-widest text-[10px]">Title & Hash</TableHead>
                <TableHead className="text-gray-400 px-8 py-4 font-bold uppercase tracking-widest text-[10px]">Category</TableHead>
                <TableHead className="text-gray-400 px-8 py-4 font-bold uppercase tracking-widest text-[10px]">Views</TableHead>
                <TableHead className="text-gray-400 px-8 py-4 font-bold uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(limit)].map((_, i) => (
                  <TableRow key={i} className="border-white/5">
                    <TableCell className="px-8 py-6"><Skeleton className="w-4 h-4 rounded" /></TableCell>
                    <TableCell className="px-8 py-6"><Skeleton className="w-48 h-28 rounded-2xl" /></TableCell>
                    <TableCell className="px-8 py-6"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="px-8 py-6"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="px-8 py-6"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="px-8 py-6 text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                videos.map((video) => (
                  <TableRow key={video.id} className={`border-white/5 transition-colors ${selectedIds.includes(video.id) ? 'bg-cyan-500/5 hover:bg-cyan-500/10' : 'hover:bg-white/5'}`}>
                    <TableCell className="px-8 py-6">
                      <Checkbox 
                        checked={selectedIds.includes(video.id)}
                        onCheckedChange={() => toggleSelect(video.id)}
                        className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                      />
                    </TableCell>
                    <TableCell className="px-8 py-6">
                      <div 
                        className="w-48 h-28 rounded-2xl overflow-hidden bg-white/5 border border-white/5 group-hover:border-cyan-500/30 transition-all duration-300 shadow-2xl cursor-pointer group/thumb relative"
                        onClick={() => setPreviewVideoHash(video.hash)}
                      >
                        <img 
                          src={video.thumbnailHash || "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=400&auto=format&fit=crop"} 
                          alt="" 
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=400&auto=format&fit=crop";
                          }}
                        />
                        <div className="absolute inset-0 bg-cyan-500/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-10 h-10 text-white fill-white" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6 font-medium">
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm line-clamp-1">{video.title}</span>
                        <span className="text-[10px] font-mono text-gray-500 tracking-tighter">{video.hash}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6">
                      <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                        {video.category}
                      </span>
                    </TableCell>
                    <TableCell className="px-8 py-6">
                      <span className="text-white font-bold text-sm">{video.views.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="px-8 py-6 text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-10 h-10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
                        onClick={() => window.open(`/watch/${video.hash}`, '_blank')}
                      >
                        <ExternalLink className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-10 h-10 rounded-xl text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => {
                          if (confirm("Permanently delete this entry?")) deleteMutation.mutate(video.id);
                        }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="p-8 border-t border-white/5 flex items-center justify-between">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} items
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-10 h-10 rounded-xl text-gray-400 border border-white/5 hover:bg-white/5 disabled:opacity-20"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="px-4 text-white font-black text-sm">{page} / {totalPages}</div>
              <Button
                variant="ghost"
                size="icon"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="w-10 h-10 rounded-xl text-gray-400 border border-white/5 hover:bg-white/5 disabled:opacity-20"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideoHash} onOpenChange={(open) => !open && setPreviewVideoHash(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-white/10">
          <DialogHeader className="p-4 bg-white/5 border-b border-white/5">
            <DialogTitle className="text-sm font-bold text-white truncate pr-8">
              {isPreviewLoading ? "Loading Source..." : previewVideo?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black flex items-center justify-center">
            {isPreviewLoading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Resolving Playback Node...</span>
              </div>
            ) : previewVideo?.playbackUrl ? (
              <video 
                src={previewVideo.playbackUrl} 
                controls 
                autoPlay 
                preload="metadata"
                className="w-full h-full object-contain"
                controlsList="nodownload"
              />
            ) : (
              <div className="text-center">
                <X className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-bold text-gray-500">Failed to load video stream</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
