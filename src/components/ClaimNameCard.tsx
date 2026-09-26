import React, { useState } from 'react';
import { UserCheck, Sparkles, Check, AlertCircle, Users, ArrowRight } from 'lucide-react';
import { db, doc, updateDoc, User } from '../firebase';
import { Exchange, Participant } from '../types';
import { playClickSound, playChimeSound } from '../utils/audio';
import { fireHolidayConfetti } from '../utils/confetti';

interface ClaimNameCardProps {
  exchange: Exchange;
  participants: Participant[];
  currentUser: User;
  onClaimed: (claimedParticipant: Participant) => void;
}

const FESTIVE_EMOJIS = ['🎅', '🎄', '🎁', '⛄', '🦌', '🍪', '🔔', '✨', '🧦', '❄️'];

export const ClaimNameCard: React.FC<ClaimNameCardProps> = ({
  exchange,
  participants,
  currentUser,
  onClaimed,
}) => {
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unclaimedParticipants = participants.filter((p) => !p.claimed && !p.userId);
  const claimedParticipants = participants.filter((p) => p.claimed || p.userId);

  const handleClaim = async () => {
    if (!selectedPartId) {
      setError('Please tap your name from the holiday list below first!');
      return;
    }

    const targetPart = participants.find((p) => p.id === selectedPartId);
    if (!targetPart) return;

    if (targetPart.claimed && targetPart.userId && targetPart.userId !== currentUser.uid) {
      setError(`"${targetPart.displayName}" has already been claimed by another participant.`);
      return;
    }

    try {
      setClaiming(true);
      setError(null);

      const partRef = doc(db, 'exchanges', exchange.id, 'participants', targetPart.id);
      const updates = {
        userId: currentUser.uid,
        email: currentUser.email || '',
        photoURL: currentUser.photoURL || '',
        claimed: true,
        claimedAt: new Date().toISOString(),
        isOrganizer: exchange.organizerId === currentUser.uid || targetPart.isOrganizer,
      };

      await updateDoc(partRef, updates);

      const updatedPart: Participant = {
        ...targetPart,
        ...updates,
      };

      playChimeSound();
      fireHolidayConfetti();
      onClaimed(updatedPart);
    } catch (err: any) {
      console.error('Error claiming spot:', err);
      setError(err.message || 'Failed to claim spot. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const selectedParticipant = participants.find((p) => p.id === selectedPartId);

  return (
    <div className="bg-gradient-to-br from-red-50 via-white to-amber-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800 border-4 border-red-400 dark:border-red-600 rounded-3xl p-6 sm:p-8 shadow-xl text-zinc-900 dark:text-zinc-100 my-4 relative overflow-hidden">
      {/* Decorative festive corner sparkles */}
      <div className="absolute top-2 right-3 text-2xl select-none opacity-40">🎄✨</div>
      <div className="absolute -bottom-4 -left-4 text-6xl select-none opacity-10">🎅</div>

      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-xs font-black uppercase tracking-wider mb-1">
            <span>🎅 Step 1: Claim Your Name</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-red-700 dark:text-red-400 tracking-tight">
            Who are you on the Nice List? 🎁
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
            The organizer ({exchange.organizerName}) has set up the guest list for <strong>{exchange.title}</strong>. 
            Tap your name below to claim your spot and unlock your wishlist!
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-100 dark:bg-red-950/70 border-2 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Unclaimed Names Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 px-1">
            <span>✨ Select Your Name ({unclaimedParticipants.length} Available):</span>
            <span className="text-[11px] text-zinc-400">Tap to choose</span>
          </div>

          {unclaimedParticipants.length === 0 ? (
            <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-dashed border-amber-300 dark:border-amber-800 text-center space-y-2">
              <span className="text-3xl">📭</span>
              <p className="font-bold text-sm text-amber-900 dark:text-amber-300">
                All names on the current list have been claimed!
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-400">
                If you are not yet on the roster, ask the organizer ({exchange.organizerName}) to add your name!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {unclaimedParticipants.map((part, idx) => {
                const isSelected = selectedPartId === part.id;
                const emoji = FESTIVE_EMOJIS[idx % FESTIVE_EMOJIS.length];

                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartId(part.id);
                      setError(null);
                      playClickSound();
                    }}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs active:scale-95 ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-700 shadow-md ring-4 ring-red-200 dark:ring-red-900/60 scale-[1.02]'
                        : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-red-100 dark:border-zinc-700 hover:border-red-300 dark:hover:border-zinc-600 hover:bg-red-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{emoji}</span>
                      <div className="min-w-0">
                        <span className="font-black text-sm block truncate">
                          {part.displayName}
                        </span>
                        <span className={`text-[10px] block truncate font-medium ${isSelected ? 'text-red-100' : 'text-zinc-400'}`}>
                          Available to claim
                        </span>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-white text-red-600 border-white font-bold text-xs'
                        : 'border-zinc-300 dark:border-zinc-600'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Claim Action Button */}
        {unclaimedParticipants.length > 0 && (
          <div className="pt-2 text-center space-y-2">
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming || !selectedPartId}
              className={`w-full sm:w-auto min-w-[280px] inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-white font-black text-sm sm:text-base shadow-lg transition-transform active:scale-95 cursor-pointer ${
                selectedPartId
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 shadow-red-500/30 animate-pulse-subtle'
                  : 'bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed opacity-75'
              }`}
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>
                {claiming 
                  ? 'Claiming your spot...' 
                  : selectedParticipant 
                  ? `✨ I am ${selectedParticipant.displayName} — Claim My Spot!` 
                  : 'Select your name above to claim'}
              </span>
            </button>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Once claimed, you can add gift ideas to your wishlist and set your preferences!
            </p>
          </div>
        )}

        {/* Already claimed section (informational) */}
        {claimedParticipants.length > 0 && (
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-2">
              Already Claimed by Friends ({claimedParticipants.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {claimedParticipants.map((cp) => (
                <div
                  key={cp.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 opacity-80"
                >
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="truncate max-w-[130px]">{cp.displayName}</span>
                  <span className="text-[10px] text-zinc-400">
                    ({cp.email ? cp.email.split('@')[0] : 'Claimed'})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
