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
import { ClerkProvider } from "@clerk/clerk-react";
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
    
    // Only add custom header for internal API calls to prevent CORS issues with external services like Clerk
    const isInternal = typeof resource === 'string' && 
      (resource.startsWith("/") || resource.includes(window.location.host));

    if (isInternal) {
      config = config || {};
      const headers = new Headers(config.headers || {});
      headers.set("x-requested-with", "VideoPortal-App");
      config.headers = headers;
    }
    
    return originalFetch(resource, config);
  };
}

const PUBLISHABLE_KEY = "pk_test_cm9idXN0LWJhc2lsaXNrLTk4LmNsZXJrLmFjY291bnRzLmRldiQ";

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

function App() {
  return (
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY} 
      afterSignOutUrl="/"
      signInUrl="/login"
      signUpUrl="/login"
      appearance={{
        elements: {
          footer: "hidden",
          footerAction: "hidden"
        }
      }}
    >
      <ThemeProvider defaultTheme="dark" storageKey="video-portal-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <div className="min-h-screen bg-[#050505] selection:bg-cyan-500/30 selection:text-cyan-400">
                <Navbar />
                <Suspense fallback={<LoadingFallback />}>
                  <Switch>
                    {/* Auth routes first */}
                    <Route path="/login" component={AuthPage} />
                    <Route path="/login/:path*" component={AuthPage} />

                    {/* Main routes */}
                    <Route path="/" component={VideoLibrary} />
                    <Route path="/watch/:hash" component={WatchVideo} />
                    <Route path="/upload" component={UploadPage} />
                    <Route path="/admin">
                      <ProtectedRoute>
                        <AdminDashboard />
                      </ProtectedRoute>
                    </Route>
                    <Route path="/categories" component={CategoriesPage} />
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
    </ClerkProvider>
  );
}

export default App;
