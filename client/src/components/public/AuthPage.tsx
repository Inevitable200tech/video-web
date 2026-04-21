import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { SignIn, SignUp, useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { isSignedIn } = useUser();
  
  // URL-aware mode selection
  const [isLogin, setIsLogin] = useState(() => {
    if (typeof window === 'undefined') return true;
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    return !(params.get("mode") === "signup" || path.includes("verify") || path.includes("sign-up"));
  });

  useEffect(() => {
    // Sync mode if URL changes manually
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    if (params.get("mode") === "signup" || path.includes("verify") || path.includes("sign-up")) {
      setIsLogin(false);
    } else if (params.get("mode") === "login") {
      setIsLogin(true);
    }
  }, [window.location.search, window.location.pathname]);

  useEffect(() => {
    // Only redirect to home if we are absolutely sure the user is in our DB
    if (!isLoading && user && isSignedIn) {
      setLocation("/");
    }
  }, [user, isLoading, isSignedIn, setLocation]);

  const clerkAppearance = {
    elements: {
      rootBox: "w-full",
      card: "bg-white/[0.02] backdrop-blur-sm border border-white/5 shadow-xl",
      headerTitle: "text-white font-bold",
      headerSubtitle: "text-muted-foreground",
      socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
      formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider",
      footerActionText: "text-muted-foreground",
      footerActionLink: "text-primary hover:text-primary/90",
      formFieldLabel: "text-muted-foreground font-medium",
      formFieldInput: "bg-white/5 border-white/10 text-white focus:border-primary/50 transition-all",
      otpCodeFieldInput: "bg-white/10 border-white/20 text-white font-bold text-xl rounded-xl focus:border-primary focus:ring-1 focus:ring-primary",
      formResendCodeLink: "text-white hover:text-white/80 transition-colors",
      dividerLine: "bg-white/10",
      dividerText: "text-muted-foreground",
      footer: "hidden",
      footerAction: "hidden"
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 pt-20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl p-8 shadow-2xl min-h-[550px] flex flex-col items-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              {isLogin ? <LogIn className="w-8 h-8 text-primary-foreground" /> : <UserPlus className="w-8 h-8 text-primary-foreground" />}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              {isLogin ? "Member Login" : "Join the Network"}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {isLogin ? "Access your premium dashboard" : "Create an account to start contributing"}
            </p>
          </div>

          <div className="w-full clerk-container relative min-h-[300px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isSignedIn && isLoading ? (
                <motion.div
                  key="loading-sync"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="flex flex-col items-center gap-6 p-8 text-center"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <ShieldCheck className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">Finalizing Session</h2>
                    <p className="text-muted-foreground text-sm max-w-[200px] mx-auto">
                      Synchronizing your profile with our secure database...
                    </p>
                  </div>
                </motion.div>
              ) : isLogin ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="w-full flex justify-center"
                >
                  <SignIn 
                    routing="path" 
                    path="/login" 
                    signUpUrl="/login?mode=signup"
                    forceRedirectUrl="/"
                    fallbackRedirectUrl="/"
                    appearance={clerkAppearance}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full flex justify-center"
                >
                  <SignUp 
                    routing="path" 
                    path="/login" 
                    signInUrl="/login?mode=login"
                    forceRedirectUrl="/"
                    fallbackRedirectUrl="/"
                    appearance={clerkAppearance}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5 flex flex-col items-center gap-4 w-full">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
            >
              {isLogin ? "Need an account? Sign Up" : "Already have an account? Log In"}
            </button>
            
            <div className="flex items-center gap-2 text-[10px] font-bold text-primary/40 uppercase tracking-[0.2em]">
              <ShieldCheck className="w-3 h-3" />
              Secure Authentication by Clerk
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
