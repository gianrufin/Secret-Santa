import React from 'react';
import { Gift, LogOut, Plus, LogIn, Moon, Sun, Settings } from 'lucide-react';
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
    <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-800 text-white flex items-center justify-center font-bold shadow-xs">
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-zinc-900 dark:text-white">Secret Santa</span>
            <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-2 hidden sm:inline">Gift Exchange</span>
          </div>
        </div>

        {/* Center / Action Controls */}
        {user && (
          <div className="flex items-center gap-2">
            {userExchanges.length > 0 && (
              <div className="hidden sm:block">
                <select
                  value={currentExchange?.id || ''}
                  onChange={(e) => {
                    const found = userExchanges.find((ex) => ex.id === e.target.value);
                    if (found) onSelectExchange(found);
                  }}
                  className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 rounded-md py-1.5 px-2.5 font-medium focus:outline-none cursor-pointer"
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
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              onClick={onJoinCode}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Join</span>
            </button>
          </div>
        )}

        {/* Right Controls: Theme Toggle + Settings + Profile */}
        <div className="flex items-center gap-2">
          {/* Quick theme toggle */}
          <button
            onClick={() => onToggleDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {user && (
            <>
              {/* Settings button */}
              <button
                onClick={onOpenSettings}
                title="Settings"
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 pl-1 border-l border-zinc-200 dark:border-zinc-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-xs font-semibold">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium hidden md:inline max-w-[100px] truncate">
                  {user.displayName || user.email}
                </span>

                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors cursor-pointer"
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
