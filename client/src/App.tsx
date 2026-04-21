import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { LoadingFallback } from "@/components/LoadingFallback";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/use-auth";
import Navbar from "./components/Navbar";
import NotFound from "./pages/not-found";

// Lazy load pages from components
const VideoLibrary = lazy(() => import("./components/public/VideoLibrary"));
const WatchVideo = lazy(() => import("./components/public/WatchVideo"));
const UploadPage = lazy(() => import("./components/private/UploadPage"));
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const CategoriesPage = lazy(() => import("./components/public/CategoriesPage"));
const AuthPage = lazy(() => import("./components/public/AuthPage"));
const ProfilePage = lazy(() => import("./components/public/ProfilePage"));

// --- Auto add Headers for CSRF Protection ------------
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    let [resource, config] = args;
    config = config || {};
    const headers = new Headers(config.headers || {});
    headers.set("x-requested-with", "VideoPortal-App");
    config.headers = headers;
    return originalFetch(resource, config);
  };
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="video-portal-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <div className="min-h-screen bg-[#050505] selection:bg-cyan-500/30 selection:text-cyan-400">
              <Navbar />
              <Suspense fallback={<LoadingFallback />}>
                <Switch>
                  <Route path="/" component={VideoLibrary} />
                  <Route path="/watch/:hash" component={WatchVideo} />
                  <Route path="/upload" component={UploadPage} />
                  <Route path="/admin">
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/categories" component={CategoriesPage} />
                  <Route path="/auth" component={AuthPage} />
                  <Route path="/profile/:username" component={ProfilePage} />
                  {/* Fallback route for 404 */}
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
              <Toaster />
            </div>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
