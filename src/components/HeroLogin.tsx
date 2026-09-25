import React, { useState, useEffect } from 'react';
import { Gift, ShieldCheck, Heart, UserCheck, AlertCircle, Sparkles, PartyPopper } from 'lucide-react';
import { signInWithPopup, auth, googleProvider, db, collection, query, where, getDocs } from '../firebase';
import { Exchange } from '../types';

export const HeroLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitedExchange, setInvitedExchange] = useState<Exchange | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam) {
      const fetchExchange = async () => {
        try {
          const snap = await getDocs(
            query(collection(db, 'exchanges'), where('code', '==', codeParam.toUpperCase()))
          );
          if (!snap.empty) {
            setInvitedExchange(snap.docs[0].data() as Exchange);
          }
        } catch (e) {
          console.error('Failed to preview exchange from invite code:', e);
        }
      };
      fetchExchange();
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups and try again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please click again to sign in.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`This domain (${window.location.hostname}) is not authorized in Firebase. Add "${window.location.hostname}" to Firebase Console → Authentication → Settings → Authorized domains.`);
      } else {
        setError(err.message || 'Unable to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm transition-colors">
        {/* Header */}
        <div className="mb-6">
          <div className="w-11 h-11 rounded-xl bg-red-800 text-white flex items-center justify-center mb-4 shadow-xs">
            <Gift className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Secret Santa Gift Exchange
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Create an exchange, create your wishlist, and draw secret names with fair random matching.
          </p>
        </div>

        {/* Invited Party Preview Banner if arriving via direct share link */}
        {invitedExchange && (
          <div className="mb-6 p-4 rounded-xl bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-800 dark:text-red-300 uppercase tracking-wider mb-1">
              <PartyPopper className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
              <span>You're Invited!</span>
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              {invitedExchange.title}
            </h2>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Budget: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{invitedExchange.budget}</strong></span>
              <span>•</span>
              <span>{invitedExchange.exchangeDate}</span>
              {invitedExchange.location && (
                <>
                  <span>•</span>
                  <span>{invitedExchange.location}</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
              Sign in below to enter the exchange and fill out your wishlist.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign In button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{invitedExchange ? 'Sign in to Join Exchange' : 'Continue with Google'}</span>
        </button>

        {/* Feature summary list */}
        <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Private matching — assignments are secret to each participant</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Heart className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>Custom wishlist with links, budget guidelines, and notes</span>
          </div>
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
            <span>Fair random draw ensuring no one receives their own name</span>
          </div>
        </div>
      </div>
    </div>
  );
};
