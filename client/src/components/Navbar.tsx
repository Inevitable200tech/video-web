import { Link, useLocation } from "wouter";
import { Play, Upload, Search, Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Read initial search query from URL
  const getQueryFromUrl = () => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") || "";
  };

  const [searchValue, setSearchValue] = useState(getQueryFromUrl);

  // Sync search input when URL changes
  useEffect(() => {
    setSearchValue(getQueryFromUrl());
  }, [location]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (value.trim()) {
      navigate(`/?q=${encodeURIComponent(value.trim())}`);
    } else {
      navigate("/");
    }
  };

  const navLinks = [
    { name: "Explore", href: "/", icon: Play },
    { name: "Upload", href: "/upload", icon: Upload },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Play className="w-6 h-6 text-primary-foreground fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground uppercase">
                FUTURE<span className="text-primary">CINEMA</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text"
                value={searchValue}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search videos..."
                className="bg-white/5 border border-white/10 rounded-full py-2 pl-11 pr-10 text-sm w-64 focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground/50"
              />
              {searchValue && (
                <button
                  onClick={() => handleSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div className={`
                    flex items-center gap-2 text-xs font-bold transition-all cursor-pointer px-4 py-2 rounded-lg uppercase tracking-wider
                    ${location === link.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}
                  `}>
                    <link.icon className="w-4 h-4" />
                    {link.name}
                  </div>
                </Link>
              ))}
            </div>

            <div className="h-6 w-[1px] bg-white/10 mx-2" />

            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/10 font-bold text-xs uppercase tracking-widest">
                <LogIn className="w-4 h-4 mr-2" />
                ADMIN
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-muted-foreground hover:text-foreground p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#0a0a0a] border-b border-white/5 px-4 pt-2 pb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              value={searchValue}
              onChange={e => { handleSearch(e.target.value); setIsMenuOpen(false); }}
              placeholder="Search videos..."
              className="bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm w-full text-white"
            />
          </div>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <div 
                onClick={() => setIsMenuOpen(false)}
                className={`
                  flex items-center gap-3 py-2 text-sm font-bold uppercase tracking-wider
                  ${location === link.href ? "text-primary" : "text-muted-foreground hover:text-foreground"}
                `}
              >
                <link.icon className="w-5 h-5" />
                {link.name}
              </div>
            </Link>
          ))}
          <Link href="/admin">
            <div 
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 py-2 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <LogIn className="w-5 h-5" />
              Admin Login
            </div>
          </Link>
        </div>
      )}
    </nav>
  );
}
