import { Link, useLocation } from "wouter";
import { Play, Upload, Search, Menu, X, LogIn, ChevronDown, LayoutGrid, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { CATEGORIES } from "@shared/constants";
import { useAuth } from "@/hooks/use-auth";
import { UserButton } from "@clerk/clerk-react";

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") || "";
  });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") || "";
    setSearchValue(q);
  }, [location]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    const params = new URLSearchParams(window.location.search);
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    navigate(qs ? `/?${qs}` : "/");
  };

  const { user, isLoading, logoutMutation } = useAuth();

  const handleLogout = () => logoutMutation.mutate();

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/20 backdrop-blur-lg border-b border-white/[0.03]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Play className="w-6 h-6 text-primary-foreground fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground uppercase">
                DESI <span className="text-primary">VIDEOS</span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                value={searchValue}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search..."
                className="bg-white/5 border border-white/10 rounded-full py-2 pl-11 pr-4 text-sm w-64 focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Links */}
            <div className="flex items-center gap-4">
              
              {/* 🏁 HOVER DROPDOWN */}
              <div className="relative group py-4">
                <button className="flex items-center gap-2 text-xs font-bold text-muted-foreground group-hover:text-primary transition-all uppercase tracking-widest outline-none">
                  Browse <ChevronDown className="w-3.5 h-3.5" />
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 w-56 bg-background/90 backdrop-blur-2xl border border-white/10 rounded-2xl py-3 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 shadow-2xl z-[60]">
                  {/* Top rated / Trending shortcut */}
                  <div className="px-2 pb-2 mb-2 border-b border-white/5">
                    <Link href="/categories">
                      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-primary/10 text-primary transition-colors cursor-pointer">
                        <LayoutGrid className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">All Categories</span>
                      </div>
                    </Link>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto px-2 space-y-1">
                    {CATEGORIES.slice(0, 8).map((cat) => (
                      <Link key={cat.name} href={cat.href}>
                        <div className="px-4 py-2.5 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer uppercase tracking-widest transition-colors flex items-center justify-between group/item">
                          <span>{cat.name}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <Link href="/upload">
                <div className={`text-xs font-bold transition-all cursor-pointer px-4 py-2 rounded-lg uppercase tracking-widest ${location === "/upload" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>
                  Upload
                </div>
              </Link>
            </div>

            <div className="h-6 w-[1px] bg-white/10 mx-2" />

            {!isLoading && user ? (
              <div className="flex items-center gap-6">
                {user.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/10 font-bold text-[10px] h-8 uppercase tracking-widest">
                      Admin
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end mr-1 hidden lg:flex">
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter leading-none">{user.username}</span>
                    <span className="text-[8px] font-bold text-primary/60 uppercase tracking-widest">{user.role}</span>
                  </div>
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "w-9 h-9 border-2 border-primary/20 hover:border-primary/50 transition-all",
                        userButtonTrigger: "focus:shadow-none",
                        userButtonPopoverFooter: "hidden",
                        footer: "hidden"
                      }
                    }}
                    userProfileProps={{
                      appearance: {
                        elements: {
                          footer: "hidden",
                          footerAction: "hidden"
                        }
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/10 font-bold text-xs uppercase tracking-widest">
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-muted-foreground p-2">
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden bg-background border-b border-white/5 px-4 pt-4 pb-8 space-y-4 shadow-2xl">
          {/* Mobile Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground focus-within:text-primary transition-colors" />
            <input 
              type="text"
              value={searchValue}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search videos..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground/50"
            />
          </div>

          <Link href="/categories">
            <div onClick={() => setIsMenuOpen(false)} className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 border border-primary/20 rounded-xl text-primary text-[10px] font-bold uppercase tracking-widest">
              <LayoutGrid className="w-4 h-4" />
              View All Categories
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.slice(0, 10).map((cat) => (
              <Link key={cat.name} href={cat.href}>
                <div onClick={() => setIsMenuOpen(false)} className="px-4 py-3 bg-white/5 rounded-lg text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                  {cat.name}
                </div>
              </Link>
            ))}
          </div>
          <Link href="/upload"><div onClick={() => setIsMenuOpen(false)} className="py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center border-t border-white/5 pt-4">Upload Video</div></Link>
          {!user ? (
            <Link href="/login"><div onClick={() => setIsMenuOpen(false)} className="py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Sign In</div></Link>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href={`/profile/${user.username}`}>
                <div onClick={() => setIsMenuOpen(false)} className="py-3 text-xs font-bold text-primary uppercase tracking-widest text-center">My Profile ({user.username})</div>
              </Link>
              <div onClick={handleLogout} className="py-3 text-xs font-bold text-red-500 uppercase tracking-widest text-center cursor-pointer">Logout</div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
