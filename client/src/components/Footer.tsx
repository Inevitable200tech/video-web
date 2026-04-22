import { Play } from "lucide-react";
import { Link } from "wouter";
import { CATEGORIES } from "@shared/constants";

export default function Footer() {
  return (
    <footer className="w-full bg-[#050505] border-t border-white/[0.03] pt-16 pb-8 mt-auto relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                  <Play className="w-5 h-5 text-primary fill-current" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground uppercase">
                  DESI <span className="text-primary">VIDEOS</span>
                </span>
              </div>
            </Link>
            <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed max-w-xs">
              Your premium destination for high-quality, curated video content. Experience the best in entertainment, securely.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6">Platform</h4>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground">
              <li>
                <Link href="/">
                  <span className="hover:text-primary transition-colors cursor-pointer">Home</span>
                </Link>
              </li>
              <li>
                <Link href="/categories">
                  <span className="hover:text-primary transition-colors cursor-pointer">Browse Categories</span>
                </Link>
              </li>
              <li>
                <Link href="/upload">
                  <span className="hover:text-primary transition-colors cursor-pointer">Upload Video</span>
                </Link>
              </li>
              <li>
                <Link href="/login">
                  <span className="hover:text-primary transition-colors cursor-pointer">Sign In / Register</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Top Categories */}
          <div>
            <h4 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6">Top Categories</h4>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground">
              {CATEGORIES.slice(0, 4).map((cat) => (
                <li key={cat.name}>
                  <Link href={cat.href}>
                    <span className="hover:text-primary transition-colors cursor-pointer">{cat.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground">
              <li>
                <Link href="/terms">
                  <span className="hover:text-primary transition-colors cursor-pointer">Terms of Service</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy">
                  <span className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link href="/dmca">
                  <span className="hover:text-primary transition-colors cursor-pointer">DMCA Compliance</span>
                </Link>
              </li>
              <li>
                <Link href="/guidelines">
                  <span className="hover:text-primary transition-colors cursor-pointer">Content Guidelines</span>
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-bold text-muted-foreground/60 tracking-wider uppercase">
            © {new Date().getFullYear()} Desi Videos. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> 
              System Online
            </span>
            <span>v1.2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
