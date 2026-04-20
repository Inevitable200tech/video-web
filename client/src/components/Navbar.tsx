import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Play, Upload, User, Search, Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Navbar() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "Explore", href: "/", icon: Play },
    { name: "Upload", href: "/upload", icon: Upload },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 bg-gradient-to-tr from-cyan-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white font-display">
                NET<span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">FLIX</span>
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search movies, shows..." 
                className="bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-6 text-sm w-80 focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all text-white placeholder:text-gray-600"
              />
            </div>

            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div className={`
                    flex items-center gap-2 text-sm font-semibold transition-all cursor-pointer px-3 py-2 rounded-lg
                    ${location === link.href ? "text-cyan-400 bg-cyan-400/10" : "text-gray-400 hover:text-white hover:bg-white/5"}
                  `}>
                    <link.icon className="w-4 h-4" />
                    {link.name}
                  </div>
                </Link>
              ))}
            </div>

            <Separator />

            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 font-bold">
                <LogIn className="w-4 h-4 mr-2" />
                ADMIN
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-400 hover:text-white p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <motion.div
        initial={false}
        animate={isMenuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        className="md:hidden overflow-hidden bg-gray-900 border-b border-gray-800"
      >
        <div className="px-4 pt-2 pb-6 space-y-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search videos..." 
              className="bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm w-full text-white"
            />
          </div>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <div 
                onClick={() => setIsMenuOpen(false)}
                className={`
                  flex items-center gap-3 py-2 text-base font-medium
                  ${location === link.href ? "text-cyan-400" : "text-gray-400 hover:text-white"}
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
              className="flex items-center gap-3 py-2 text-base font-medium text-gray-400 hover:text-white"
            >
              <LogIn className="w-5 h-5" />
              Admin Login
            </div>
          </Link>
        </div>
      </motion.div>
    </nav>
  );
}

function Separator() {
  return <div className="h-4 w-[1px] bg-gray-800 mx-2" />;
}
