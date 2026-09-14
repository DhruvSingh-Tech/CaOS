import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Bell,
  ShieldCheck,
  User,
  GraduationCap,
  Clock,
  Crown,
  LogIn,
  Command,
  Menu,
  X,
} from 'lucide-react';
import { Button } from './ui/Button';
import { UserRole } from '../types';
import { useAuth } from '../lib/auth';

interface NavbarProps {
  currentRole: UserRole;
  onOpenSearch: () => void;
  onOpenAI: () => void;
  onOpenAuthModal: () => void;
  onNavigateTo: (view: string) => void;
  unreadChangesCount: number;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Navbar({
  currentRole,
  onOpenSearch,
  onOpenAI,
  onOpenAuthModal,
  onNavigateTo,
  unreadChangesCount,
  onToggleMobileMenu,
  isMobileMenuOpen,
}: NavbarProps) {
  const { user } = useAuth();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeRole = user?.role || currentRole;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1720px] mx-auto w-full">
        {/* Left: Hamburger (Mobile) & Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Hamburger Button */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 -ml-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-white" />
            ) : (
              <Menu className="h-5 w-5 text-zinc-300" />
            )}
          </button>

          <div
            onClick={() => onNavigateTo('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950 shadow-sm transition-transform group-hover:scale-105">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">CaOS</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                  AR-1 B2
                </span>
              </div>
              <p className="text-[11px] font-medium text-zinc-400 -mt-0.5">
                USAR • GGSIPU East Delhi Campus
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-4 ml-2 border-l border-zinc-800 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-mono text-zinc-200 font-medium">{timeStr}</span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <span className="text-zinc-400 font-mono text-[11px]">Odd Semester 2026-27</span>
          </div>
        </div>

        {/* Center: Global Search Command Trigger */}
        <div className="flex-1 max-w-md mx-6 hidden lg:block">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-zinc-400 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all hover:text-zinc-200 group cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Search className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              <span>Search timetable, syllabus, faculty, notes...</span>
            </span>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-800 border border-zinc-700 rounded">
              <Command className="h-3 w-3" /> K
            </kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Mobile search trigger */}
          <button
            onClick={onOpenSearch}
            className="lg:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Academic AI Assistant Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAI}
            className="hidden sm:flex border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-xs font-medium"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Academic AI</span>
          </Button>

          {/* "What's Changed?" Notification Bell */}
          <button
            onClick={() => onNavigateTo('whats-changed')}
            className="relative p-2 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="What's Changed? Audit Log"
          >
            <Bell className="h-4 w-4" />
            {unreadChangesCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-zinc-950">
                {unreadChangesCount}
              </span>
            )}
          </button>

          {/* User Profile or Sign In CTA */}
          {user ? (
            <button
              onClick={onOpenAuthModal}
              className={`flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                user.role === 'admin'
                  ? 'border-red-900/60 bg-red-950/30 text-red-300 hover:bg-red-950/50'
                  : user.role === 'cr'
                  ? 'border-amber-900/60 bg-amber-950/30 text-amber-300 hover:bg-amber-950/50'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
              title="Account & Role Management"
            >
              {user.role === 'admin' ? (
                <Crown className="h-4 w-4 text-red-400" />
              ) : user.role === 'cr' ? (
                <ShieldCheck className="h-4 w-4 text-amber-400" />
              ) : (
                <User className="h-4 w-4 text-zinc-400" />
              )}

              <div className="hidden md:flex flex-col items-start leading-tight text-left">
                <span className="font-semibold text-white text-xs max-w-[110px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
                  {user.role}
                </span>
              </div>
            </button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={onOpenAuthModal}
              className="text-xs font-semibold py-1.5 shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5 mr-1" />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
