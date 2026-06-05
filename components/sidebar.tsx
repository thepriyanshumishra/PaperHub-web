'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { 
  Home, 
  FileText, 
  Sparkles, 
  BookOpen, 
  User, 
  Calendar, 
  Download, 
  Moon, 
  Sun, 
  LogOut,
  X
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { fbUser, logout } = useAuth();
  
  // Use local theme toggler code if next-themes is not configured, or a simple custom one.
  const handleToggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    // Force a component re-render to reflect theme changes
    router.refresh();
  };

  const isDarkMode = typeof window !== 'undefined' ? document.documentElement.classList.contains('dark') : true;

  const menuItems = [
    { name: 'Home', icon: Home, path: '/dashboard' },
    { name: 'Tests', icon: FileText, path: '/tests' },
    { name: 'PaperHub Premium', icon: Sparkles, path: '/premium', highlight: true },
    { name: 'Notebooks', icon: BookOpen, path: '/notebooks' },
    { name: 'Profile', icon: User, path: '/profile' },
    { name: 'Exam Info', icon: Calendar, path: '/exam-info' },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const baseSidebarStyle = `
    fixed inset-y-0 left-0 z-40 w-64 border-r border-border-primary/50 bg-bg-secondary/70 backdrop-blur-md p-6 flex flex-col justify-between 
    transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:z-0
  `;

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`${baseSidebarStyle} ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="space-y-8">
          {/* Logo / Header */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-display font-bold text-lg shadow-md shadow-accent/20">
                P
              </div>
              <span className="font-display font-bold text-lg tracking-tight group-hover:text-accent transition-colors">PaperHub</span>
            </Link>
            <button 
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Menu Links */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
              
              return (
                <Link 
                  key={item.name}
                  href={item.path}
                  className={`
                    flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 group
                    ${isActive 
                      ? 'bg-accent/10 border border-accent/20 text-accent' 
                      : 'hover:bg-bg-tertiary/40 border border-transparent text-text-secondary hover:text-text-primary'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-primary'}`} />
                  <span className="flex-grow">{item.name}</span>
                  {item.highlight && (
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
                      PRO
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="space-y-4">
          {/* Install Extension */}
          <button className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/40 border border-transparent transition-all group">
            <Download className="w-4 h-4 shrink-0 text-text-muted group-hover:text-text-primary" />
            <span>Install Extension</span>
          </button>

          {/* Theme Toggler */}
          <button 
            onClick={handleToggleTheme}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/40 border border-transparent transition-all group"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 shrink-0 text-text-muted group-hover:text-text-primary" />
                <span>Turn on light mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 shrink-0 text-text-muted group-hover:text-text-primary" />
                <span>Turn on dark mode</span>
              </>
            )}
          </button>

          {/* Logout */}
          {fbUser && (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all group"
            >
              <LogOut className="w-4 h-4 shrink-0 text-red-400 group-hover:text-red-500" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
