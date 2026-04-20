import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trash2, Video as VideoIcon, ExternalLink, BarChart3, Users, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

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

  const { data: response, isLoading } = useQuery<{ videos: Video[], total: number }>({
    queryKey: ["/api/videos", "admin"],
    queryFn: async () => {
      const res = await fetch("/api/videos?limit=100");
      return res.json();
    }
  });

  const videos = response?.videos || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/videos/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Video deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: () => {
      toast({ title: "Delete failed", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8">
      <div className="max-w-[1400px] mx-auto space-y-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight text-white mb-2">CONTROL <span className="text-cyan-400">CENTER</span></h1>
            <p className="text-gray-500 font-semibold tracking-widest uppercase text-xs">Managing distributed content nodes</p>
          </div>
          <div className="flex gap-4">
            <Button className="glass bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20 font-bold px-6 h-12 rounded-xl">
              <Settings className="w-4 h-4 mr-2" /> SYSTEM CONFIG
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <VideoIcon className="w-20 h-20 text-white" />
            </div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Total Library</div>
            <div className="text-5xl font-black font-display text-white">{videos?.length || 0}</div>
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
          <div className="p-8 border-b border-white/5">
            <h2 className="text-2xl font-black font-display">CONTENT <span className="text-cyan-400">MANAGEMENT</span></h2>
          </div>
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-gray-400 px-8 py-4 font-bold uppercase tracking-widest text-[10px]">Title & Hash</TableHead>
                <TableHead className="text-gray-400 px-8 py-4 font-bold uppercase tracking-widest text-[10px]">Category</TableHead>
                <TableHead className="text-gray-400 px-8 py-4 font-bold uppercase tracking-widest text-[10px]">Views</TableHead>
                <TableHead className="text-gray-400 px-8 py-4 font-bold uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos?.map((video) => (
                <TableRow key={video.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="px-8 py-6 font-medium">
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-lg">{video.title}</span>
                      <span className="text-[10px] font-mono text-gray-500 tracking-tighter">{video.hash}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                      {video.category}
                    </span>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <span className="text-white font-bold">{video.views.toLocaleString()}</span>
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
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
