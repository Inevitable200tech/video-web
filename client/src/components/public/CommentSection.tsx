import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { MessageSquare, Send, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

interface Comment {
  id: string;
  videoId: string;
  userId: {
    _id: string;
    username: string;
    avatarHash?: string;
  } | null;
  text: string;
  createdAt: string;
}

interface CommentSectionProps {
  videoId: string;
}

export default function CommentSection({ videoId }: CommentSectionProps) {
  const [commentText, setCommentText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { user } = useAuth();

  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: [`/api/videos/${videoId}/comments`],
  });

  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, text }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/comments`] });
      setCommentText("");
      toast({ title: "Comment posted!" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText);
  };

  return (
    <div id="comment-section" className="mt-12 space-y-8">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wider">Comments</h3>
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
            {comments?.length || 0}
          </span>
        </div>
      </div>

      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <Textarea 
                id="comment-input"
                placeholder="Share your thoughts on this video..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="bg-white/[0.03] border-white/10 rounded-xl min-h-[100px] focus:border-primary/50 transition-all resize-none text-sm placeholder:text-muted-foreground/30"
              />
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={commentMutation.isPending || !commentText.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-widest px-6 h-10 rounded-lg"
                >
                  <Send className="w-3.5 h-3.5 mr-2" />
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-8 text-center">
          <p className="text-muted-foreground text-sm font-medium mb-4">You must be signed in to leave a comment.</p>
          <Button variant="outline" asChild className="border-primary/20 text-primary hover:bg-primary/10 font-bold text-xs uppercase tracking-widest">
            <a href="/auth">Sign In to Comment</a>
          </Button>
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-6">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/5 rounded w-1/4" />
                <div className="h-12 bg-white/5 rounded w-full" />
              </div>
            </div>
          ))
        ) : comments && comments.length > 0 ? (
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div 
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex gap-4 group">
                  {/* Avatar — links to profile */}
                  <Link href={comment.userId ? `/profile/${comment.userId.username}` : '#'}>
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-primary/30 hover:border-primary/60 transition-colors cursor-pointer overflow-hidden">
                      {comment.userId?.avatarHash ? (
                        <img src={`https://www.gravatar.com/avatar/${comment.userId.avatarHash}?d=identicon`} alt={comment.userId.username} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      {/* Username — links to profile */}
                      <Link href={comment.userId ? `/profile/${comment.userId.username}` : '#'}>
                        <span className={`text-sm font-bold transition-colors cursor-pointer ${comment.userId ? 'text-foreground hover:text-primary' : 'text-muted-foreground line-through'}`}>
                          {comment.userId?.username || '[Deleted User]'}
                        </span>
                      </Link>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(comment.createdAt))} ago
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-50">No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
}
