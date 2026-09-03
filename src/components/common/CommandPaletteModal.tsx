import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { NavRoute } from '../../types';
import { getVisibleNavRoutes } from '../../router/routeRegistry';
import {
  Search,
  LayoutDashboard,
  Grid3X3,
  FileText,
  Bell,
  Briefcase,
  Download,
  Settings,
  Wallet,
  Cpu,
  ArrowRightLeft,
  Sparkles,
  Globe,
  Sun,
  Moon,
  ExternalLink,
  Command,
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({ isOpen, onClose }) => {
  const {
    setActiveRoute,
    toggleAICopilot,
    toggleTheme,
    theme,
    setStellarNetwork,
    stellarNetwork,
  } = useAppStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const navRoutes = getVisibleNavRoutes();

  // Filter routes and actions
  const actionItems = [
    ...navRoutes.map((r) => ({
      id: r.id,
      title: r.label,
      subtitle: r.description,
      category: 'Navigation',
      iconName: r.icon,
      onSelect: () => {
        setActiveRoute(r.id);
        onClose();
      },
    })),
    {
      id: 'action-toggle-ai',
      title: 'Open Gemini AI Co-Pilot',
      subtitle: 'Ask natural language queries and synthesize visual charts',
      category: 'Quick Action',
      iconName: 'Sparkles',
      onSelect: () => {
        toggleAICopilot();
        onClose();
      },
    },
    {
      id: 'action-switch-network',
      title: `Switch Network to ${stellarNetwork === 'mainnet' ? 'Testnet' : 'Mainnet'}`,
      subtitle: `Current active environment: ${stellarNetwork}`,
      category: 'Quick Action',
      iconName: 'Globe',
      onSelect: () => {
        setStellarNetwork(stellarNetwork === 'mainnet' ? 'testnet' : 'mainnet');
        onClose();
      },
    },
    {
      id: 'action-toggle-theme',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: 'Toggle theme display mode',
      category: 'Quick Action',
      iconName: theme === 'dark' ? 'Sun' : 'Moon',
      onSelect: () => {
        toggleTheme();
        onClose();
      },
    },
  ];

  const filteredItems = actionItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard':
        return <LayoutDashboard className="w-4 h-4 text-sky-400" />;
      case 'Grid3X3':
        return <Grid3X3 className="w-4 h-4 text-indigo-400" />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'Bell':
        return <Bell className="w-4 h-4 text-amber-400" />;
      case 'Briefcase':
        return <Briefcase className="w-4 h-4 text-purple-400" />;
      case 'Search':
        return <Search className="w-4 h-4 text-cyan-400" />;
      case 'Download':
        return <Download className="w-4 h-4 text-rose-400" />;
      case 'Wallet':
        return <Wallet className="w-4 h-4 text-emerald-400" />;
      case 'Cpu':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'ArrowRightLeft':
        return <ArrowRightLeft className="w-4 h-4 text-sky-400" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-sky-400" />;
      case 'Globe':
        return <Globe className="w-4 h-4 text-emerald-400" />;
      case 'Sun':
        return <Sun className="w-4 h-4 text-amber-400" />;
      case 'Moon':
        return <Moon className="w-4 h-4 text-sky-400" />;
      case 'Settings':
        return <Settings className="w-4 h-4 text-zinc-400" />;
      default:
        return <Search className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800 bg-zinc-950/60">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, navigate views, or search..."
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 font-mono focus:outline-none"
          />
          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 font-mono text-xs">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No matching commands or navigation routes found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-sky-500/10 border border-sky-500/40 text-white'
                      : 'text-zinc-300 hover:bg-zinc-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 bg-zinc-800/80 rounded-lg border border-zinc-700/50">
                      {renderIcon(item.iconName)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white truncate">{item.title}</div>
                      <div className="text-[11px] text-zinc-400 truncate">{item.subtitle}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider ml-2 shrink-0">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>Nolyvatix Quick Actions</span>
          </div>
        </div>
      </div>
    </div>
  );
};
