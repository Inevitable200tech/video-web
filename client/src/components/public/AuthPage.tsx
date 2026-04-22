import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { SignIn, useUser, useSignUp, useSignIn } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

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
      footerAction: "hidden",
      header: "hidden"
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
              {isLogin ? "Member Login" : "Enjoy The Videos"}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {isLogin ? "Welcome Back User, Login to continue" : "Create an account to continue"}
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
                  className="w-full flex justify-center px-4"
                >
                  <CustomSignUp />
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
              Secure Authentication
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CustomSignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const e = email.toLowerCase();
    return e.endsWith("@gmail.com") || e.endsWith("@hotmail.com") || e.endsWith("@outlook.com");
  };

  const validatePassword = (pass: string) => {
    const minLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    return minLength && hasUpper && hasNumber && hasSpecial;
  };

  const onSignUpPress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");

    if (!validateEmail(emailAddress)) {
      setError("Only @gmail.com, @hotmail.com, or @outlook.com are allowed.");
      return;
    }
    if (!validatePassword(password)) {
      setError("Password must be at least 8 chars, 1 uppercase, 1 number, and 1 special character.");
      return;
    }

    setIsLoading(true);
    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "An error occurred during sign up.");
    } finally {
      setIsLoading(false);
    }
  };

  const onPressVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setIsLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });
      if (completeSignUp.status !== 'complete') {
        setError("Verification incomplete.");
      } else {
        await setActive({ session: completeSignUp.createdSessionId });
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Invalid verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <form onSubmit={onPressVerify} className="w-full flex flex-col gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Verification Code</label>
          <Input 
            value={code} 
            onChange={(e) => setCode(e.target.value)} 
            placeholder="Enter code sent to email" 
            className="w-full bg-white/5 border-white/10 text-white font-bold text-center text-lg h-14 focus:border-primary focus:ring-1 focus:ring-primary transition-all tracking-[0.5em]"
          />
        </div>
        {error && <p className="text-destructive text-sm font-bold text-center">{error}</p>}
        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider h-12 mt-2 transition-all"
        >
          {isLoading ? "Verifying..." : "Verify Email"}
        </Button>
      </form>
    );
  }

  const { signIn } = useSignIn();

  const handleGoogleSignUp = async () => {
    try {
      if (!signIn) return;
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/"
      });
    } catch (err: any) {
      console.error("OAuth Error:", err);
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || "Google authentication failed. Please try again.");
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={onSignUpPress} className="w-full flex flex-col gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Email Address</label>
          <Input 
            type="email" 
            value={emailAddress} 
            onChange={(e) => setEmailAddress(e.target.value)} 
            placeholder="user@gmail.com" 
            className="w-full bg-white/5 border-white/10 text-white h-11 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Password</label>
          <Input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special" 
            className="w-full bg-white/5 border-white/10 text-white h-11 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
          />
        </div>
        {error && <p className="text-destructive text-sm font-bold">{error}</p>}
        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider h-11 mt-2 transition-all"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-[1px] bg-white/10"></div>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Or</span>
        <div className="flex-1 h-[1px] bg-white/10"></div>
      </div>

      <Button 
        type="button"
        onClick={handleGoogleSignUp}
        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold h-11 transition-all shadow-none"
      >
        <GoogleIcon />
        Continue with Google
      </Button>
    </div>
  );
}
