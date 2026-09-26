import React, { useState } from 'react';
import { X, AlertCircle, Sparkles, KeyRound } from 'lucide-react';
import { User, db, collection, query, where, getDocs } from '../firebase';
import { Exchange } from '../types';
import { playClickSound, playChimeSound } from '../utils/audio';

interface JoinExchangeModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onJoined: (exchange: Exchange) => void;
}

export const JoinExchangeModal: React.FC<JoinExchangeModalProps> = ({
  user,
  isOpen,
  onClose,
  onJoined,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter the holiday room code!');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const q = query(collection(db, 'exchanges'), where('code', '==', cleanCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No holiday gift exchange found with that room code. Please check with your host!');
        return;
      }

      const exchangeDoc = querySnapshot.docs[0];
      const exchangeData = exchangeDoc.data() as Exchange;

      playChimeSound();
      onJoined(exchangeData);
      onClose();
    } catch (err: any) {
      console.error('Error joining exchange:', err);
      setError(err.message || 'Failed to join exchange. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border-4 border-red-500 rounded-3xl p-6 sm:p-7 shadow-2xl text-zinc-900 dark:text-zinc-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-100 dark:bg-zinc-800 text-red-700 dark:text-red-400 flex items-center justify-center hover:bg-red-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center mx-auto text-2xl shadow-md">
            🗝️
          </div>
          <h2 className="text-lg font-black text-red-700 dark:text-red-400 tracking-tight">
            Join Holiday Exchange
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Enter the holiday room code given by your host. Then, pick your name to claim your spot! 🎅
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-100 dark:bg-red-950/70 border-2 border-red-300 text-red-800 dark:text-red-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 text-center">
              Room Code (e.g. XMAS1234)
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="XMAS..."
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full text-center tracking-widest uppercase font-mono text-lg font-black bg-red-50/50 dark:bg-zinc-800 border-2 border-red-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-red-700 dark:text-red-400 placeholder-zinc-400 focus:outline-none focus:border-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 text-white text-xs sm:text-sm font-black shadow-lg transition-transform active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{loading ? 'Finding Party...' : 'Join Holiday Party 🎁'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
