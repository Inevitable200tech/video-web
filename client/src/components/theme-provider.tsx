import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  // 1. Set defaultTheme to 'dark' for first-time visitors (if no stored preference)
  defaultTheme = "dark", 
  storageKey = "navamukunda-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => {
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        return defaultTheme;
      }
      
      const storedValue = localStorage.getItem(storageKey);
      
      // FIX for Type 'string' is not assignable to type 'Theme':
      // Safely check if the stored string is a valid Theme before assigning.
      if (storedValue === "dark" || storedValue === "light" || storedValue === "system") {
        return storedValue;
      }
      
      return defaultTheme;
    }
  );

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    let currentTheme = theme;

    if (currentTheme === "system") {
      let systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      
      // 2. THE OVERRIDE: If the user's system preference is 'light', we force it to 'dark'
      if (systemTheme === "light") {
        systemTheme = "dark";
      }

      currentTheme = systemTheme as Theme;
    }

    root.classList.add(currentTheme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, theme);
      }
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};