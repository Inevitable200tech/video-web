import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Clock, LogOut, X } from "lucide-react";

export const SessionTimer = () => {
  const [, setLocation] = useLocation();
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        setIsExpired(true);
        return;
      }

      try {
        // Decode JWT to get expiration time
        const parts = token.split(".");
        if (parts.length !== 3) {
          setIsExpired(true);
          return;
        }

        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const remaining = Math.max(0, expirationTime - now);

        if (remaining <= 0) {
          setIsExpired(true);
          localStorage.removeItem("adminToken");
          setLocation("/admin");
          clearInterval(interval);
          return;
        }

        // Format time as MM:SS or HH:MM:SS
        const seconds = Math.floor(remaining / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          setTimeRemaining(
            `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(
              seconds % 60
            ).padStart(2, "0")}`
          );
        } else {
          setTimeRemaining(
            `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(
              2,
              "0"
            )}`
          );
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        setIsExpired(true);
        localStorage.removeItem("adminToken");
        setLocation("/admin");
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [setLocation]);

  if (isExpired) {
    return null;
  }

  // Mobile layout - hidden by default, tap to show
  if (isMobile) {
    return (
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        {/* Show timer box when isVisible is true */}
        {isVisible && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-lg p-3 w-64 max-w-[calc(100vw-2rem)] border-l-4 border-amber-600 mb-4">
            {/* Header with close button */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold text-white">
                  Session Timer
                </span>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-white hover:text-white/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Time display */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-bold text-white font-mono">
                {timeRemaining}
              </span>
              <span className="text-xs text-white/80">left</span>
            </div>

            {/* Warning message */}
            <p className="text-xs text-white/90 mb-2">
              Auto logout on expiry
            </p>

            {/* Logout button */}
            <button
              onClick={() => {
                localStorage.removeItem("adminToken");
                window.location.href = "/admin";
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 px-2 rounded-md transition-colors flex items-center justify-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Logout
            </button>
          </div>
        )}

        {/* Tap indicator - always visible */}
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full p-3 shadow-lg flex items-center justify-center transition-all active:scale-95"
        >
          <Clock className="w-6 h-6 animate-pulse" />
        </button>
      </div>
    );
  }

  // Desktop layout - click to show
  return (
    <div className="hidden md:block fixed bottom-8 right-8 z-50">
      {/* Show timer box when isVisible is true */}
      {isVisible && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-lg p-4 w-64 border-l-4 border-amber-600 mb-4">
          {/* Header with close button */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-white" />
              <span className="text-sm font-semibold text-white">
                Session Timer
              </span>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white hover:text-white/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Time display */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-white font-mono">
              {timeRemaining}
            </span>
            <span className="text-xs text-white/80">remaining</span>
          </div>

          {/* Warning message */}
          <p className="text-xs text-white/90 mb-3">
            You'll be logged out when time expires
          </p>

          {/* Logout button */}
          <button
            onClick={() => {
              localStorage.removeItem("adminToken");
              window.location.href = "/admin";
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 group"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            Logout Now
          </button>
        </div>
      )}

      {/* Click indicator - always visible */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full p-3 shadow-lg flex items-center justify-center transition-all active:scale-95"
      >
        <Clock className="w-6 h-6 animate-pulse" />
      </button>
    </div>
  );
};
