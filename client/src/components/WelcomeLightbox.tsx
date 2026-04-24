import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const SESSION_KEY = "welcome_lightbox_shown";

export default function WelcomeLightbox() {
  const { user, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Automatically clear the session flag if the user logs out.
    // This catches Clerk <UserButton /> logouts, session expiries, and mobile logouts.
    if (!user) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }

    // If we have a user, check if we should show the lightbox
    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    if (!alreadyShown) {
      setIsOpen(true);
    }
  }, [user, isLoading]);

  const handleClose = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-[480px] bg-[#0D0D0D] border border-white/10 rounded-[2rem] p-10 shadow-2xl overflow-hidden"
          >
            {/* Subtle top accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            {/* Close X */}
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center space-y-7">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Important  <span className="text-primary">Notice</span>
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-[320px] mx-auto">
                  By accessing this site, you confirm that you are at least 18 years old and are not violating any laws in your jurisdiction.

                </p>
                <br />
                <p className="text-red-500 text-sm font-bold text-center">The website is development please bookmark this website, more <strong>Content Daily Avaliable</strong></p>
                <br />
                <p className="text-red-500 text-sm font-bold text-center">Note:-  <strong> Some content has been removed </strong> Due to storage issue . They will be back at the end of the month. Thank you</p>
              </div>

              <Button
                onClick={handleClose}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs transition-all active:scale-[0.98]"
              >
                OK , I am 18+ or over
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}