import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Video as VideoIcon, ExternalLink, BarChart3, Users, Edit3,
  CheckSquare, X, Search, ChevronLeft, ChevronRight, Play, ShieldCheck,
  Eye, Heart, ChevronDown, Database, Activity, RefreshCcw, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface Video {
  id: string;
  title: string;
  hash: string;
  thumbnailHash?: string;
  views: number;
  likes: number;
  category: string;
  uploadedAt: string;
}

interface UserData {
  id: string;
  username: string;
  role: string;
  bio?: string;
  createdAt: string;
}

interface SourceData {
  id: string;
  name: string;
  url: string;
  token?: string;
  isActive: boolean;
  lastSync?: string;
  createdAt: string;
}

type Tab = "videos" | "users" | "sources";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("videos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [titlePattern, setTitlePattern] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [previewHash, setPreviewHash] = useState<string | null>(null);
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", url: "", token: "" });
  const limit = 15;

  // Reset page on search
  useEffect(() => { setPage(1); }, [search]);

  // ── Video list ──
  const { data: response, isLoading } = useQuery<{ videos: Video[], total: number }>({
    queryKey: ["/api/videos", "admin", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (search) params.set("q", search);
      const res = await fetch(`/api/videos?${params}`);
      return res.json();
    }
  });

  const videos = response?.videos || [];
  const total = response?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ── Preview playback ──
  const { data: previewPlayback, isLoading: previewLoading } = useQuery<{ playbackUrl: string }>({
    queryKey: [`/api/videos/${previewHash}/playback`],
    queryFn: async () => {
      const res = await fetch(`/api/videos/${previewHash}/playback`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!previewHash,
  });

  const previewTitle = videos.find(v => v.hash === previewHash)?.title;

  // ── Delete ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast({ title: "Video deleted" });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  // ── Bulk rename ──
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { ids: string[], titlePattern: string }) => {
      const res = await fetch("/api/videos/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Bulk update failed");
    },
    onSuccess: () => {
      toast({ title: "Bulk rename applied" });
      setIsBulkEditDialogOpen(false);
      setSelectedIds([]);
      setTitlePattern("");
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: () => toast({ title: "Bulk update failed", variant: "destructive" }),
  });

  // ── User Management ──
  const { data: users, isLoading: usersLoading } = useQuery<UserData[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: tab === "users",
  });
  useEffect(() => {
    if (users) console.log("[ADMIN] Users data:", users);
  }, [users]);

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<UserData> }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast({ title: "User deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  // ── Source Management ──
  const { data: sources, isLoading: sourcesLoading } = useQuery<SourceData[]>({
    queryKey: ["/api/admin/sources"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sources");
      if (!res.ok) throw new Error("Failed to fetch sources");
      return res.json();
    },
    enabled: tab === "sources",
  });

  const createSourceMutation = useMutation({
    mutationFn: async (data: Partial<SourceData>) => {
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Source added" });
      setIsAddSourceOpen(false);
      setNewSource({ name: "", url: "", token: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sources"] });
    },
    onError: () => toast({ title: "Failed to add source", variant: "destructive" }),
  });

  const updateSourceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<SourceData> }) => {
      const res = await fetch(`/api/admin/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/sources"] }),
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/sources/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast({ title: "Source removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sources"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/sources/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
    },
    onSuccess: () => toast({ title: "Sync initiated" }),
    onError: () => toast({ title: "Sync failed", variant: "destructive" }),
  });

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === videos.length ? [] : videos.map(v => v.id));

  const totalViews = videos.reduce((acc, v) => acc + v.views, 0);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4 sm:px-8">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Admin Panel</span>
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tight">
              Control <span className="text-primary">Center</span>
            </h1>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
              Signed in as {user?.username}
            </p>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search videos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border-white/10 rounded-xl pl-11 pr-4 h-12 w-72 text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* ─── Stats ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: "Total Videos", value: total.toLocaleString(), icon: VideoIcon },
            { label: "Network Views", value: totalViews.toLocaleString(), icon: Eye },
            { label: "Page Views", value: `${page} / ${totalPages}`, icon: BarChart3 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-black text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit border border-white/5">
          {(["videos", "users", "sources"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ─── Bulk Actions Bar ─── */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-primary/10 border border-primary/20 rounded-2xl p-5 flex items-center justify-between sticky top-24 z-40 shadow-lg shadow-primary/5"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-foreground font-bold text-sm">{selectedIds.length} videos selected</p>
                  <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Ready for batch operations</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsBulkEditDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-5 h-9 text-xs uppercase tracking-widest"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Bulk Rename
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedIds([])}
                  className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Video Table ─── */}
        {tab === "videos" && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Content Management</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span>Select All</span>
                <Checkbox
                  checked={selectedIds.length === videos.length && videos.length > 0}
                  onCheckedChange={toggleSelectAll}
                  className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
            </div>

            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-12 px-6" />
                  <TableHead className="text-muted-foreground px-4 py-3 font-bold uppercase tracking-widest text-[10px]">Thumbnail</TableHead>
                  <TableHead className="text-muted-foreground px-4 py-3 font-bold uppercase tracking-widest text-[10px]">Title</TableHead>
                  <TableHead className="text-muted-foreground px-4 py-3 font-bold uppercase tracking-widest text-[10px]">Category</TableHead>
                  <TableHead className="text-muted-foreground px-4 py-3 font-bold uppercase tracking-widest text-[10px]">Views</TableHead>
                  <TableHead className="text-muted-foreground px-4 py-3 font-bold uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell className="px-6 py-4"><Skeleton className="w-4 h-4 rounded bg-white/5" /></TableCell>
                      <TableCell className="px-4 py-4"><Skeleton className="w-32 h-20 rounded-xl bg-white/5" /></TableCell>
                      <TableCell className="px-4 py-4"><Skeleton className="h-4 w-48 bg-white/5" /></TableCell>
                      <TableCell className="px-4 py-4"><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                      <TableCell className="px-4 py-4"><Skeleton className="h-4 w-10 bg-white/5" /></TableCell>
                      <TableCell className="px-4 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto bg-white/5" /></TableCell>
                    </TableRow>
                  ))
                  : videos.map((video) => (
                    <TableRow
                      key={video.id}
                      className={`border-white/5 transition-colors ${selectedIds.includes(video.id) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-white/[0.02]"}`}
                    >
                      <TableCell className="px-6 py-4">
                        <Checkbox
                          checked={selectedIds.includes(video.id)}
                          onCheckedChange={() => toggleSelect(video.id)}
                          className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div
                          className="w-32 h-20 rounded-xl overflow-hidden bg-black border border-white/5 cursor-pointer relative group/thumb"
                          onClick={() => setPreviewHash(video.hash)}
                        >
                          <img
                            src={video.thumbnailHash || "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=400&auto=format&fit=crop"}
                            alt=""
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=400&auto=format&fit=crop"; }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-7 h-7 text-white fill-white" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="space-y-1">
                          <Link href={`/watch/${video.hash}`}>
                            <p className="text-foreground font-bold text-sm line-clamp-1 hover:text-primary transition-colors cursor-pointer">{video.title}</p>
                          </Link>
                          <p className="text-[10px] font-mono text-muted-foreground/60 tracking-tighter">{video.hash.slice(0, 24)}...</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">{video.category}</span>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          {video.views.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10"
                            onClick={() => window.open(`/watch/${video.hash}`, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { if (confirm("Delete this video?")) deleteMutation.mutate(video.id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {total > 0 ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}` : "No results"}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-lg border border-white/5 hover:bg-white/5 disabled:opacity-20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-black text-foreground px-2">{page} / {totalPages}</span>
                <Button variant="ghost" size="icon" disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 rounded-lg border border-white/5 hover:bg-white/5 disabled:opacity-20"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Users Tab ─── */}
        {tab === "users" && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground">User Management</h2>
            </div>

            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-muted-foreground px-6 py-3 font-bold uppercase tracking-widest text-[10px]">Username</TableHead>
                  <TableHead className="text-muted-foreground px-6 py-3 font-bold uppercase tracking-widest text-[10px]">Role</TableHead>
                  <TableHead className="text-muted-foreground px-6 py-3 font-bold uppercase tracking-widest text-[10px]">Joined Date</TableHead>
                  <TableHead className="text-muted-foreground px-6 py-3 font-bold uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-32 bg-white/5" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-24 bg-white/5" /></TableCell>
                      <TableCell className="px-6 py-4 text-right"><Skeleton className="h-8 w-24 ml-auto bg-white/5" /></TableCell>
                    </TableRow>
                  ))
                ) : users && users.length > 0 ? (
                  users.map((u) => (
                    <TableRow key={u.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                      <TableCell className="px-6 py-4 font-bold text-foreground">
                        <Link href={`/profile/${u.username}`}>
                          <span className="hover:text-primary cursor-pointer transition-colors">{u.username}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          u.role === "admin" ? "bg-primary/10 text-primary" : "bg-white/5 text-muted-foreground"
                        }`}>
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs text-muted-foreground">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={u.username === user?.username}
                          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 disabled:opacity-0"
                          onClick={() => updateUserMutation.mutate({ 
                            id: u.id, 
                            updates: { role: u.role === "admin" ? "user" : "admin" } 
                          })}
                        >
                          {u.role === "admin" ? "Demote" : "Make Admin"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={u.username === user?.username}
                          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-0"
                          onClick={() => { if (confirm(`Delete user ${u.username}?`)) deleteUserMutation.mutate(u.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="w-8 h-8 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No users found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ─── Sources Tab ─── */}
        {tab === "sources" && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Video Sources</h2>
                <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-widest">Manage external storage nodes</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => syncMutation.mutate()} 
                  disabled={syncMutation.isPending}
                  variant="ghost" 
                  className="gap-2 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/5 hover:bg-primary/10 text-primary"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                  Sync All
                </Button>
                <Button 
                  onClick={() => setIsAddSourceOpen(true)}
                  className="gap-2 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Source
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-muted-foreground px-6 py-3 font-bold uppercase tracking-widest text-[10px]">Source Name</TableHead>
                  <TableHead className="text-muted-foreground px-6 py-3 font-bold uppercase tracking-widest text-[10px]">API Endpoint</TableHead>
                  <TableHead className="text-muted-foreground px-6 py-3 font-bold uppercase tracking-widest text-[10px]">Status</TableHead>
                  <TableHead className="text-muted-foreground px-6 py-3 font-bold uppercase tracking-widest text-[10px]">Last Sync</TableHead>
                  <TableHead className="text-muted-foreground px-6 py-3 font-bold uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourcesLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-32 bg-white/5" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-48 bg-white/5" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-4 w-24 bg-white/5" /></TableCell>
                      <TableCell className="px-6 py-4 text-right"><Skeleton className="h-8 w-24 ml-auto bg-white/5" /></TableCell>
                    </TableRow>
                  ))
                ) : sources?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Database className="w-12 h-12 opacity-10" />
                        <p className="text-xs font-bold uppercase tracking-widest">No external sources registered</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sources?.map((s) => (
                  <TableRow key={s.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${s.isActive ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
                        <span className="font-bold text-foreground">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <code className="text-[10px] bg-white/5 px-2 py-1 rounded text-muted-foreground">{s.url}</code>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`text-[10px] font-black uppercase tracking-widest h-7 px-3 rounded-full ${
                          s.isActive ? "bg-primary/10 text-primary" : "bg-white/5 text-muted-foreground"
                        }`}
                        onClick={() => updateSourceMutation.mutate({ id: s.id, updates: { isActive: !s.isActive } })}
                      >
                        {s.isActive ? "Active" : "Disabled"}
                      </Button>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs text-muted-foreground">
                      {s.lastSync ? new Date(s.lastSync).toLocaleString() : "Never"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { if (confirm(`Remove source ${s.name}?`)) deleteSourceMutation.mutate(s.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      </div>

      {/* ─── Preview Dialog ─── */}
      <Dialog open={!!previewHash} onOpenChange={(open) => !open && setPreviewHash(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-white/10">
          <DialogHeader className="p-4 border-b border-white/5 bg-white/[0.03]">
            <DialogTitle className="text-sm font-bold text-foreground truncate pr-8">
              {previewTitle || "Loading..."}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black flex items-center justify-center">
            {previewLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Preparing stream...</span>
              </div>
            ) : previewPlayback?.playbackUrl ? (
              <video
                src={previewPlayback.playbackUrl}
                controls autoPlay preload="metadata"
                className="w-full h-full object-contain"
                controlsList="nodownload"
              />
            ) : (
              <div className="text-center">
                <X className="w-10 h-10 text-destructive mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold text-muted-foreground">Failed to load stream</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Rename Dialog ─── */}
      <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-2xl border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              Bulk <span className="text-primary">Rename</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Title Pattern</Label>
              <Input
                placeholder="e.g. Wildlife Documentary Part {n}"
                value={titlePattern}
                onChange={(e) => setTitlePattern(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl h-12 text-foreground placeholder:text-muted-foreground/30"
              />
              <p className="text-[10px] text-muted-foreground">
                Use <span className="text-primary font-bold">{"{n}"}</span> to insert an auto-incrementing number.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsBulkEditDialogOpen(false)} className="text-muted-foreground font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, titlePattern })}
              disabled={!titlePattern.trim() || bulkUpdateMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6 uppercase tracking-widest text-xs"
            >
              Apply to {selectedIds.length} Videos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
