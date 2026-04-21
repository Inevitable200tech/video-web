import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { getQueryFn, queryClient } from "../lib/queryClient";
import { useUser, useClerk } from "@clerk/clerk-react";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  logoutMutation: { mutate: () => Promise<void>; isPending: boolean };
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  
  const {
    data: user,
    error,
    isLoading: dbLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: clerkLoaded && isSignedIn,
    retry: false,
  });

  const isLoading = !clerkLoaded || (isSignedIn && dbLoading);

  // Diagnostic logging
  if (typeof window !== 'undefined') {
    console.log("[AUTH-STATUS]", {
      clerkLoaded,
      isSignedIn,
      dbLoading,
      hasUser: !!user,
      finalLoading: isLoading
    });
  }

  const logoutMutation = {
    mutate: async () => {
      await signOut();
      queryClient.setQueryData(["/api/me"], null);
    },
    isPending: false,
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
