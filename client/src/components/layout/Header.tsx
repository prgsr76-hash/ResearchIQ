import { useLocation } from 'react-router-dom';
import { Search, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/library': 'Research Library',
  '/chat': 'AI Chat',
  '/compare': 'Paper Comparison',
  '/review': 'Literature Review',
  '/gaps': 'Gap Detection',
};

interface HeaderProps {
  onToggleMobile?: () => void;
}

export default function Header({ onToggleMobile }: HeaderProps) {
  const location = useLocation();
  const { user } = useAuth();

  const pageTitle =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith('/papers/') ? 'Paper Details' : 'ResearchIQ');

  return (
    <header className="h-16 border-b border-border bg-surface-alt/40 backdrop-blur-xl flex items-center justify-between px-6 flex-shrink-0 z-20">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-xl font-semibold text-text">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border text-text-dim text-sm w-64">
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs bg-surface-alt px-1.5 py-0.5 rounded border border-border">
            ⌘K
          </kbd>
        </div>

        {/* User Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold ring-2 ring-primary/20">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}
