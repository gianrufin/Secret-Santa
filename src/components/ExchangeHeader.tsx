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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-3">
          {/* Status & badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                isDrawn
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}
            >
              {isDrawn ? '✓ Secret Santas Drawn' : '• Registration & Wishlists Open'}
            </span>

            {isOrganizer && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                Organizer
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
            {exchange.title}
          </h1>

          {exchange.description && (
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
              {exchange.description}
            </p>
          )}

          {/* Details list */}
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="inline-flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
              <span className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-[10px]">
                {currencySym}
              </span>
              <span>Budget: <strong className="text-emerald-700 dark:text-emerald-400">{exchange.budget}</strong></span>
            </div>

            <div className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>{exchange.exchangeDate}</span>
            </div>

            {exchange.registrationDeadline && (
              <div className="inline-flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Wishlists Lock: <strong>{exchange.registrationDeadline}</strong></span>
              </div>
            )}

            <div className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>{exchange.location}</span>
            </div>

            <div className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>{participants.length} participants ({readyCount} ready)</span>
            </div>
          </div>
        </div>

        {/* Room Code & Invite Share Card */}
        <div className="flex sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800">
          <div className="text-left md:text-right">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold block uppercase tracking-wider">
              Room Code
            </span>
            <span className="text-xl font-mono font-bold text-red-700 dark:text-red-400 tracking-wider">
              {exchange.code}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenShare && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenShare();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Quick Share</span>
              </button>
            )}

            <button
              onClick={handleCopyInvite}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Countdown Clock banner */}
      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
