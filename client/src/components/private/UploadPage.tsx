import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Film, Info, Type, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

export default function UploadPage() {
  const { data: user, isLoading: userLoading } = useQuery<{ id: string, username: string }>({ 
    queryKey: ["/api/me"],
    retry: false
  });

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Cinema");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      const response = await axios.post("/api/videos/upload", formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          );
          setUploadProgress(percentCompleted);
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Upload Successful",
        description: "Your video is now being distributed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setTimeout(() => setLocation("/"), 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.response?.data?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !description) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);

    uploadMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 2GB.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.split(".")[0]);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 pt-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight">Access Restricted</h2>
          <p className="text-muted-foreground font-medium mb-8">
            You must be a registered member of the network to upload cinematic content. 
            Join our global community to start contributing.
          </p>
          <div className="flex flex-col gap-3">
            <Button asChild className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest">
              <Link href="/auth">Sign In / Register</Link>
            </Button>
            <Button variant="ghost" asChild className="h-12 rounded-xl text-muted-foreground hover:text-white uppercase tracking-widest text-[10px] font-bold">
              <Link href="/">Return to Library</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl"
      >
        <div className="glass-card rounded-[2rem] overflow-hidden shadow-[0_0_100px_-20px_rgba(34,211,238,0.15)] border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            {/* Left Side: Cinematic Banner */}
            <div className="lg:col-span-2 p-10 bg-gradient-to-br from-cyan-500/20 via-purple-600/10 to-transparent flex flex-col justify-between border-r border-white/5 relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-8 border border-white/10">
                  <Film className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-4xl font-black font-display text-white mb-6 leading-tight">
                  PUBLISH YOUR <br />
                  <span className="text-cyan-400">VISION</span>
                </h2>
                <p className="text-gray-400 font-medium leading-relaxed mb-8">
                  Upload your cinematic masterpieces to our distributed storage network. Reach a global audience instantly.
                </p>
              </div>

              <div className="space-y-6 relative z-10">
                {[
                  { icon: CheckCircle2, text: "Distributed Global Delivery" },
                  { icon: CheckCircle2, text: "Multi-Format Support (Up to 2GB)" },
                  { icon: CheckCircle2, text: "Instant Network Discovery" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-bold text-white/70 uppercase tracking-widest">
                    <item.icon className="w-5 h-5 text-cyan-500" />
                    {item.text}
                  </div>
                ))}
              </div>

              {/* Decorative Elements */}
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/20 rounded-full blur-[100px]" />
            </div>

            {/* Right Side: Form */}
            <div className="lg:col-span-3 p-8 lg:p-12">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  {/* File Upload Zone */}
                  <div className="relative group">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      disabled={isUploading}
                    />
                    <div className={`
                      relative border-2 border-dashed rounded-[1.5rem] p-12 text-center transition-all duration-500
                      ${file ? "border-cyan-500 bg-cyan-500/5 shadow-[0_0_40px_-10px_rgba(34,211,238,0.2)]" : "border-white/10 group-hover:border-cyan-500/50 bg-white/5"}
                    `}>
                      <div className={`
                        w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110
                        ${file ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/40" : "bg-white/5 text-gray-500"}
                      `}>
                        <Upload className="w-10 h-10" />
                      </div>
                      <p className="text-lg font-bold text-white mb-1">
                        {file ? file.name : "Select Cinema File"}
                      </p>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                        MP4 / WebM • Max 2GB
                      </p>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Video Title</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter title..."
                        className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500/50 text-white font-bold placeholder:text-gray-700"
                        disabled={isUploading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Genre / Category</Label>
                      <Input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="e.g. Action, Drama..."
                        className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500/50 text-white font-bold placeholder:text-gray-700"
                        disabled={isUploading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Production Notes</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your masterpiece..."
                      className="min-h-[120px] bg-white/5 border-white/10 rounded-xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500/50 text-white font-medium placeholder:text-gray-700 p-4"
                      disabled={isUploading}
                      required
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {isUploading && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Network Transmission</span>
                          <span className="text-sm text-gray-400 font-bold">Encrypting & Distributing...</span>
                        </div>
                        <span className="text-3xl font-black font-display text-white">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  className={`
                    w-full h-16 rounded-2xl font-black font-display text-xl tracking-tight transition-all duration-500
                    ${!file || isUploading ? "bg-white/5 text-gray-700 cursor-not-allowed" : "bg-white text-black hover:bg-cyan-400 hover:shadow-[0_0_50px_-12px_rgba(34,211,238,0.5)]"}
                  `}
                  disabled={!file || isUploading}
                >
                  {isUploading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      PROCESSING...
                    </div>
                  ) : (
                    "START PUBLISHING"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
