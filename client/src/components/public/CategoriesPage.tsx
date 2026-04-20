import { CATEGORIES } from "@shared/constants";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function CategoriesPage() {
  const { data: thumbnails } = useQuery<Record<string, string>>({
    queryKey: ["/api/categories/thumbnails"],
  });

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 text-primary mb-4"
          >
            <LayoutGrid className="w-8 h-8" />
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground uppercase">
              Explore <span className="text-primary">Collections</span>
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-sm font-bold uppercase tracking-[0.3em]"
          >
            Select a category to discover content
          </motion.p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {CATEGORIES.map((cat, index) => (
            <Link key={cat.name} href={cat.href}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="group relative aspect-[16/10] rounded-[2rem] overflow-hidden cursor-pointer border border-white/10 bg-black shadow-2xl"
              >
                {/* Full Background Image - Always Visible */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src={thumbnails?.[cat.name] || "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop"} 
                    alt={cat.name}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
                  />
                  {/* Stronger Bottom Shadow for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                </div>

                {/* Content Overlay - Always Visible */}
                <div className="absolute inset-0 p-10 flex flex-col justify-end z-10">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">
                      {cat.name}
                    </h3>
                    <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
                      <span>Open Collection</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* Subtle Hover Glow Effect */}
                <div className="absolute -inset-2 bg-primary/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
