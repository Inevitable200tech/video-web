import { motion } from "framer-motion";
import { Shield, FileText, Lock, AlertTriangle, Search, Send, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function LegalLayout({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="min-h-screen pt-32 pb-24 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">{title}</h1>
            </div>
            
            <div className="prose prose-invert prose-blue max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-10 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground">
              {children}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" icon={FileText}>
      <h2>1. Introduction</h2>
      <p>Welcome to the platform. By accessing or using our services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not access the service.</p>
      
      <h2>2. User Accounts</h2>
      <p>You must provide accurate and complete information when creating an account. You are solely responsible for the activity that occurs on your account and for keeping your account password secure.</p>
      
      <h2>3. Content Uploads</h2>
      <p>By uploading content to the platform, you grant us a worldwide, non-exclusive, royalty-free license to host, store, use, display, reproduce, and distribute the content. You represent and warrant that you own or have the necessary rights to all content you upload.</p>
      
      <h2>4. Prohibited Conduct</h2>
      <ul>
        <li>Uploading illegal, infringing, or highly explicit/graphic material.</li>
        <li>Attempting to hack, destabilize, or abuse the platform's infrastructure.</li>
        <li>Harassing other users or spamming the comment sections.</li>
      </ul>
    </LegalLayout>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" icon={Lock}>
      <h2>1. Information We Collect</h2>
      <p>We collect information you provide directly to us when you create an account, such as your email address. We also automatically collect certain information about your device and how you interact with our platform (e.g., IP addresses, browser types, and viewing history).</p>
      
      <h2>2. How We Use Information</h2>
      <p>We use the information we collect to provide, maintain, and improve our services. This includes personalizing your experience, providing customer support, and monitoring the security of the platform.</p>
      
      <h2>3. Information Sharing</h2>
      <p>We do not sell your personal data. We may share information with third-party vendors who need access to perform work on our behalf (such as database hosting or secure authentication services).</p>
      
      <h2>4. Data Security</h2>
      <p>We use industry-standard security measures to protect your data. However, no security system is impenetrable, and we cannot guarantee the absolute security of your information against highly sophisticated attacks.</p>
    </LegalLayout>
  );
}

export function DMCACompliance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [conflictType, setConflictType] = useState("Copyright Infringement");
  const [reportDetails, setReportDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/videos", "search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return { videos: [] };
      const res = await fetch(`/api/videos?q=${encodeURIComponent(debouncedSearch)}&limit=5`);
      return res.json();
    },
    enabled: !!debouncedSearch.trim(),
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dmca-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: selectedVideo.id,
          videoHash: selectedVideo.hash,
          videoTitle: selectedVideo.title,
          conflictType: conflictType,
          details: reportDetails
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit report");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Report Submitted", description: "The admin has been notified." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo || !reportDetails.trim()) {
      toast({ variant: "destructive", title: "Required Fields", description: "Please select a video and provide details." });
      return;
    }
    reportMutation.mutate();
  };

  return (
    <LegalLayout title="DMCA Compliance" icon={Shield}>
      <h2>1. Copyright Infringement Policy</h2>
      <p>We respect the intellectual property rights of others. It is our policy to respond promptly to clear notices of alleged copyright infringement that comply with the Digital Millennium Copyright Act ("DMCA").</p>
      
      <h2>2. Submit a Takedown Notice</h2>
      <p>If you believe that your work has been copied in a way that constitutes copyright infringement, you can file an official takedown request below. <strong>The Request May Take 48 Hours to take action ..</strong></p>
      
      <div className="mt-8 bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 not-prose">
        {!user ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-primary/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-6 text-sm">To prevent spam, you must be signed in to submit a DMCA report.</p>
            <Link href="/login">
              <Button className="font-bold tracking-widest uppercase">Sign In to Report</Button>
            </Link>
          </div>
        ) : submitted ? (
          <div className="text-center py-10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-2">Report Received</h3>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">Your DMCA takedown notice has been securely transmitted to the administration team for immediate review via Resend.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-bold text-white uppercase tracking-widest block">1. Select Infringing Video</label>
              
              {!selectedVideo ? (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="text" 
                      placeholder="Search for the video title..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-11 bg-white/5 border-white/10 focus:border-primary/50 h-12 text-white"
                    />
                  </div>
                  
                  {searchTerm && searchResults?.videos && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl max-h-[300px] overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">Searching...</div>
                      ) : searchResults.videos.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">No videos found.</div>
                      ) : (
                        searchResults.videos.map((v: any) => (
                          <div 
                            key={v.id} 
                            onClick={() => { setSelectedVideo(v); setSearchTerm(""); }}
                            className="flex gap-4 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors items-center"
                          >
                            <img src={v.thumbnailHash || "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=200&auto=format&fit=crop"} className="w-20 aspect-video object-cover rounded-md bg-black" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{v.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-1 truncate">ID: {v.hash}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-4 p-4 bg-white/5 border border-primary/30 rounded-xl items-center">
                  <img src={selectedVideo.thumbnailHash || "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=200&auto=format&fit=crop"} className="w-24 aspect-video object-cover rounded-md bg-black" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{selectedVideo.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Hash: {selectedVideo.hash}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedVideo(null)} className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 uppercase text-xs font-bold tracking-wider">
                    Change
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <label className="text-sm font-bold text-white uppercase tracking-widest block">2. Type of Issue</label>
              <Select value={conflictType} onValueChange={setConflictType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                  <SelectValue placeholder="Select conflict type" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                  <SelectItem value="Video Copyright Issue">Video Copyright Issue</SelectItem>
                  <SelectItem value="Illegal Content">Illegal Content</SelectItem>
                  <SelectItem value="Minor / Underage Content">Minor / Underage Content</SelectItem>
                  <SelectItem value="Fake or Morph Content">Fake or Morph Content</SelectItem>
                  <SelectItem value="Terrorist / Extremist Content">Terrorist / Extremist Content</SelectItem>
                  <SelectItem value="Personal Invasion of Privacy">Personal Invasion of Privacy</SelectItem>
                  <SelectItem value="Other Issue (Please Describe in Details)">Other Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-white uppercase tracking-widest block">3. Proof & Details</label>
              <Textarea 
                placeholder="Please describe why this video infringes your copyright. Include links to original work if applicable. By submitting this form, you state under penalty of perjury that you are the copyright owner or authorized to act on their behalf."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="min-h-[150px] bg-white/5 border-white/10 focus:border-primary/50 text-white resize-none text-sm placeholder:text-muted-foreground/50"
              />
            </div>

            <Button 
              type="submit" 
              disabled={reportMutation.isPending || !selectedVideo || !reportDetails.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] disabled:opacity-50"
            >
              {reportMutation.isPending ? "Submitting..." : <><Send className="w-4 h-4" /> Submit Official Report</>}
            </Button>
          </form>
        )}
      </div>
      
    </LegalLayout>
  );
}

export function ContentGuidelines() {
  return (
    <LegalLayout title="Content Guidelines" icon={AlertTriangle}>
      <h2>1. Acceptable Content</h2>
      <p>We encourage creativity, entertainment, and the sharing of high-quality video content. All uploads must comply with these guidelines to ensure a safe environment for all users.</p>
      
      <h2>2. Restricted Content</h2>
      <p>The following types of content are strictly prohibited and will result in immediate removal and potential account termination:</p>
      <ul>
        <li>Content that promotes violence, terrorism, or illegal acts.</li>
        <li>Non-consensual explicit material, severe gore, or deepfakes.</li>
        <li>Hate speech or severe harassment targeting individuals or groups.</li>
        <li>Spam, deceptive metadata, or misleading thumbnails.</li>
      </ul>
      
      <h2>3. Moderation and Enforcement</h2>
      <p>Our moderation team reserves the right to review, flag, and remove any content that violates these guidelines. In severe cases, we will report illegal material to the appropriate law enforcement authorities.</p>
    </LegalLayout>
  );
}
