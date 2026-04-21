// src/components/ProtectedRoute.tsx
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // If done loading and no user at all, redirect to auth
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground font-bold uppercase tracking-widest text-xs">
          Verifying session...
        </span>
      </div>
    );
  }

  // Logged in but not admin
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-sm">You don't have permission to view this page.</p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-white/10 font-bold uppercase tracking-widest text-xs">
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Not logged in (redirect handled by useEffect above, show nothing while redirecting)
  if (!user) return null;

  // ✅ Admin verified
  return children;
};
