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
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 pt-20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full" />
      </div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        <div className="w-20 h-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/20">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight">System Maintenance</h2>
        <p className="text-muted-foreground font-medium mb-8 leading-relaxed">
          The upload gateway is temporarily offline . 
          .
        </p>
        <div className="flex flex-col gap-3">
          <Button variant="ghost" asChild className="h-12 rounded-xl text-muted-foreground hover:text-white uppercase tracking-widest text-[10px] font-bold bg-white/5">
            <Link href="/">Return to Library</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

