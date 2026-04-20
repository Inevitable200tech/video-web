// src/components/ProtectedRoute.tsx
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import { SessionTimer } from "./SessionTimer";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [location, setLocation] = useLocation();
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setIsVerified(false);

      // 🔑 Redirect ONLY if trying to access an /admin route
      if (location.startsWith("/admin")) {
        setLocation("/admin");
      }
      return;
    }

    fetch("/api/admin/verify", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          setToken("");
          localStorage.removeItem("adminToken");
          setIsVerified(false);

          if (location.startsWith("/admin")) {
            setLocation("/admin");
          }
        } else {
          setIsVerified(true);
        }
      })
      .catch(() => {
        setToken("");
        localStorage.removeItem("adminToken");
        setIsVerified(false);

        if (location.startsWith("/admin")) {
          setLocation("/admin");
        }
      });
  }, [token, setLocation, location]);

  // While verifying, show spinner
  if (isVerified === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Checking authentication...</span>
      </div>
    );
  }

  // ✅ If not verified:
  // - For /admin routes, user will already be redirected to /admin by useEffect
  // - For non-admin routes, show NotFound
  return isVerified ? (
    <>
      <SessionTimer />
      {children}
    </>
  ) : (
    <NotFound />
  );
};
