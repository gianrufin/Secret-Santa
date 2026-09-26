import React from 'react';
import { Gift, LogOut, Plus, LogIn, Moon, Sun, Settings, Sparkles } from 'lucide-react';
import { User, signOut, auth } from '../firebase';
import { Exchange } from '../types';

interface NavbarProps {
  user: User | null;
  currentExchange: Exchange | null;
  userExchanges: Exchange[];
  onSelectExchange: (exchange: Exchange) => void;
  onCreateNew: () => void;
  onJoinCode: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (val: boolean) => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentExchange,
  userExchanges,
  onSelectExchange,
  onCreateNew,
  onJoinCode,
  isDarkMode,
  onToggleDarkMode,
  onOpenSettings,
}) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b-2 border-red-200 dark:border-zinc-800 transition-colors w-full">
      {/* Top candy cane festive thin stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-red-500 via-emerald-500 to-amber-500" />

      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 overflow-x-hidden">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-bold shadow-xs animate-gentle-bounce">
            🎁
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm text-red-700 dark:text-red-400 tracking-tight">
              Secret Santa
            </span>
            <span className="text-zinc-400 dark:text-zinc-500 text-xs hidden sm:inline font-bold">
              Party
            </span>
            <span className="text-xs">🎄</span>
          </div>
        </div>

        {/* Center / Action Controls */}
        {user && (
          <div className="flex items-center gap-2 min-w-0">
            {userExchanges.length > 0 && (
              <div className="hidden sm:block min-w-0">
                <select
                  value={currentExchange?.id || ''}
                  onChange={(e) => {
                    const found = userExchanges.find((ex) => ex.id === e.target.value);
                    if (found) onSelectExchange(found);
                  }}
                  className="max-w-[140px] md:max-w-[220px] truncate bg-red-50/60 dark:bg-zinc-800 border-2 border-red-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-xl py-1.5 px-2.5 font-bold focus:outline-none cursor-pointer"
                >
                  {userExchanges.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
              title="Create new holiday exchange"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              onClick={onJoinCode}
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border-2 border-red-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer shrink-0"
              title="Join with room code"
            >
              <LogIn className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>Join</span>
            </button>
          </div>
        )}

        {/* Right Controls: Theme Toggle + Settings + Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick theme toggle */}
          <button
            onClick={() => onToggleDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </button>

          {user && (
            <>
              {/* Settings button */}
              <button
                onClick={onOpenSettings}
                title="Exchange Settings & Management"
                className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 pl-1 border-l border-zinc-200 dark:border-zinc-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-xl object-cover border-2 border-red-200 dark:border-zinc-700 shadow-2xs"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center text-xs font-black shadow-2xs">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="text-xs text-zinc-800 dark:text-zinc-200 font-bold hidden md:inline max-w-[90px] truncate" title={user.displayName || user.email || ''}>
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>

                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
