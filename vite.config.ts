import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import Sitemap from "vite-plugin-sitemap";
import fs from "fs";

// Custom plugin to generate robots.txt
const generateRobotsTxt: Plugin = {
  name: "generate-robots-txt",
  apply: "build",
  enforce: "post",
  async closeBundle() {
    const robotsTxt = `# Robots.txt for nmhss.onrender.com
User-agent: *
Allow: /
Allow: /api/media/

# Allow scraping of media images via API endpoint
Disallow: /admin

# Sitemap
Sitemap: https:/desi-new-video.onrender.com/sitemap.xml
`;
    const outDir = path.resolve("dist/public");
    // Add a small delay to ensure Sitemap plugin has finished
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(path.join(outDir, "robots.txt"), robotsTxt);
    console.log("✓ robots.txt generated with media crawling rules");
  },
};

export default defineConfig({
  plugins: [
    Sitemap({
      hostname: "https://desi-new-video.onrender.com",
      dynamicRoutes: [
        "/",
        "/?sortBy=views",
        "/?q=Mallu",
        "/?q=Hot",
        "/?q=HD",
        "/?q=New",
        "/?q=OnlyFans",
        "/?q=Aunty",
        "/?q=Bhabhi",
        "/?q=Indian",
        
      ],
      outDir: "dist/public",
    }),

    generateRobotsTxt,

    react(),
    runtimeErrorOverlay(),

    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [await import("@replit/vite-plugin-cartographer").then(m => m.cartographer())]
      : []),
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },

  root: path.resolve(import.meta.dirname, "client"),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600, // Suppress warning for vendor
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("@tanstack")) return "query";
            if (id.includes("aos")) return "aos";
            if (id.includes("react-helmet-async")) return "helmet";
            return "vendor";
          }
        },
      },
    },
  },

  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
