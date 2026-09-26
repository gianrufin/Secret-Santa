import React, { useState } from 'react';
import { Calendar, DollarSign, MapPin, Copy, Check, Users, Sparkles, Share2, Lock } from 'lucide-react';
import { Exchange, Participant, getCurrencySymbol } from '../types';
import { CountdownTimer } from './CountdownTimer';
import { formatPartyInviteMessage } from '../utils/share';
import { playChimeSound, playClickSound } from '../utils/audio';

interface ExchangeHeaderProps {
  exchange: Exchange;
  participants: Participant[];
  isOrganizer: boolean;
  onOpenShare?: () => void;
}

export const ExchangeHeader: React.FC<ExchangeHeaderProps> = ({
  exchange,
  participants,
  isOrganizer,
  onOpenShare,
}) => {
  const [copied, setCopied] = useState(false);

  const readyCount = participants.filter((p) => p.isWishlistReady).length;
  const claimedCount = participants.filter((p) => p.claimed || p.userId).length;
  const isDrawn = exchange.status === 'drawn';
  const currencySym = getCurrencySymbol(exchange.currency);

  const handleCopyInvite = () => {
    const inviteText = formatPartyInviteMessage(exchange);
    navigator.clipboard.writeText(inviteText);
    playChimeSound();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-3 min-w-0 flex-1">
          {/* Status & badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center text-xs font-black px-3 py-1 rounded-full border-2 ${
                isDrawn
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
              }`}
            >
              {isDrawn ? '✓ Secret Santas Drawn! 🎅' : '🎄 Roster Registration & Wishlists Open'}
            </span>

            {!isDrawn && participants.length >= 2 && (
              <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-2 border-rose-300 dark:border-rose-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>List Ready • Draw Ahead Available! 🎲</span>
              </span>
            )}

            {isOrganizer && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 dark:bg-zinc-800 text-red-800 dark:text-red-300 border-2 border-red-200 dark:border-zinc-700">
                Host / Organizer 👑
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-red-700 dark:text-red-400 tracking-tight break-words">
            {exchange.title}
          </h1>

          {exchange.description && (
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed break-words font-medium">
              {exchange.description}
            </p>
          )}

          {/* Details list */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="inline-flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 bg-emerald-50 dark:bg-zinc-800 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-zinc-700">
              <span className="w-4 h-4 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                {currencySym}
              </span>
              <span>Budget: <strong className="text-emerald-700 dark:text-emerald-400">{exchange.budget}</strong></span>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-700 font-medium">
              <Calendar className="w-3.5 h-3.5 text-red-500" />
              <span>Party: {exchange.exchangeDate}</span>
            </div>

            {exchange.registrationDeadline && (
              <div className="inline-flex items-center gap-1.5 text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-900/60 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Lock: {exchange.registrationDeadline}</span>
              </div>
            )}

            {exchange.location && (
              <div className="inline-flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-700 font-medium max-w-[200px] truncate" title={exchange.location}>
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="truncate">{exchange.location}</span>
              </div>
            )}

            <div className="inline-flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-700 font-medium">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>{claimedCount} of {participants.length} Claimed ({readyCount} ready)</span>
            </div>
          </div>
        </div>

        {/* Room Code & Invite Share Card */}
        <div className="flex sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="text-left md:text-right">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black block uppercase tracking-wider">
              Holiday Room Code
            </span>
            <span className="text-2xl font-mono font-black text-red-700 dark:text-red-400 tracking-wider">
              {exchange.code}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenShare && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenShare();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyInvite}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-red-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-zinc-800 text-red-700 dark:text-red-400 text-xs font-bold transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Info</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Countdown Clock banner */}
      <div className="pt-4 border-t-2 border-dashed border-red-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {exchange.registrationDeadline && !isDrawn && (
          <CountdownTimer 
            targetDate={exchange.registrationDeadline} 
            label="Wishlist Lock in:" 
            targetTime="23:59:59" 
          />
        )}
        <CountdownTimer 
          targetDate={exchange.exchangeDate} 
          label="Party Event in:" 
        />
      </div>
    </div>
  );
};
