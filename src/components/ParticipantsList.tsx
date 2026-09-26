import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Check, 
  Clock, 
  AlertCircle, 
  Eye,
  Shield,
  Sparkles,
  Share2,
  LogOut,
  UserMinus,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  Gift,
  UserCheck
} from 'lucide-react';
import { db, doc, writeBatch, deleteDoc, updateDoc, setDoc, collection, query, where, getDocs } from '../firebase';
import { Exchange, Participant, Assignment } from '../types';
import { generateSecretSantaDraw } from '../utils/santaDraw';
import { fireHolidayConfetti } from '../utils/confetti';
import { playChimeSound, playClickSound } from '../utils/audio';

interface ParticipantsListProps {
  exchange: Exchange;
  participants: Participant[];
  currentUserId: string;
  isOrganizer: boolean;
  onViewWishlist?: (participant: Participant) => void;
  onOpenShare?: () => void;
  onLeaveExchange?: (exchangeId: string) => void;
  onClaimName?: (participant: Participant) => void;
}

const FESTIVE_EMOJIS = ['🎅', '🎄', '🎁', '⛄', '🦌', '🍪', '🔔', '✨', '🧦', '❄️'];

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  exchange,
  participants,
  currentUserId,
  isOrganizer,
  onViewWishlist,
  onOpenShare,
  onLeaveExchange,
  onClaimName,
}) => {
  const [localParticipants, setLocalParticipants] = useState<Participant[]>(participants);

  useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);

  const [drawing, setDrawing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEarlyUnlockModal, setShowEarlyUnlockModal] = useState(false);
  const [showAddRosterModal, setShowAddRosterModal] = useState(false);
  const [newRosterName, setNewRosterName] = useState('');
  const [addRosterLoading, setAddRosterLoading] = useState(false);

  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null);
  const [participantToReset, setParticipantToReset] = useState<Participant | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCount = localParticipants.length;
  const claimedCount = localParticipants.filter((p) => p.claimed || p.userId).length;
  const readyCount = localParticipants.filter((p) => p.isWishlistReady).length;
  const isDrawn = exchange.status === 'drawn';
  const allReady = totalCount >= 2 && readyCount === totalCount;
  const isUnlocked = Boolean(exchange.isDrawUnlocked);

  // Check if current user has already claimed a participant slot
  const currentUserParticipant = localParticipants.find((p) => p.userId === currentUserId);
  const hasClaimed = Boolean(currentUserParticipant);

  // Toggle Draw Unlock
  const handleToggleDrawLock = async (forceUnlock = false) => {
    if (!isOrganizer) return;
    try {
      setUnlockLoading(true);
      setError(null);

      if (!isUnlocked && !allReady && !forceUnlock) {
        setShowEarlyUnlockModal(true);
        return;
      }

      const nextUnlockedState = !isUnlocked || forceUnlock;
      const exRef = doc(db, 'exchanges', exchange.id);
      await updateDoc(exRef, {
        isDrawUnlocked: nextUnlockedState,
      });

      playClickSound();
      setShowEarlyUnlockModal(false);
    } catch (err: any) {
      console.error('Failed to toggle draw lock:', err);
      setError(err.message || 'Failed to update draw lock status.');
    } finally {
      setUnlockLoading(false);
    }
  };

  // Add a new person to the roster (Organizer feature)
  const handleAddPersonToRoster = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newRosterName.trim();
    if (!trimmed) return;

    if (localParticipants.some((p) => p.displayName.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" is already on the holiday roster!`);
      return;
    }

    try {
      setAddRosterLoading(true);
      setError(null);

      const partId = 'part_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const newPart: Participant = {
        id: partId,
        displayName: trimmed,
        isOrganizer: false,
        claimed: false,
        isWishlistReady: false,
        joinedAt: new Date().toISOString(),
        preferences: {
          likes: '',
          dislikes: '',
          clothingSize: '',
          notes: '',
        },
        wishlist: [],
      };

      await setDoc(doc(db, 'exchanges', exchange.id, 'participants', partId), newPart);

      setLocalParticipants((prev) => [...prev, newPart]);
      setNewRosterName('');
      setShowAddRosterModal(false);
      playChimeSound();
    } catch (err: any) {
      console.error('Failed to add participant:', err);
      setError(err.message || 'Failed to add participant to roster.');
    } finally {
      setAddRosterLoading(false);
    }
  };

  // Claim a spot directly from the list
  const handleDirectClaim = async (person: Participant) => {
    if (person.claimed && person.userId && person.userId !== currentUserId) {
      setError(`"${person.displayName}" has already been claimed by someone else!`);
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const updates = {
        userId: currentUserId,
        claimed: true,
        claimedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'exchanges', exchange.id, 'participants', person.id), updates);

      const updated = { ...person, ...updates };
      setLocalParticipants((prev) => prev.map((p) => p.id === person.id ? updated : p));
      playChimeSound();
      fireHolidayConfetti();

      if (onClaimName) {
        onClaimName(updated);
      }
    } catch (err: any) {
      console.error('Failed to claim:', err);
      setError(err.message || 'Failed to claim spot.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset a claim (Organizer can free up a slot if someone made an accidental mistake)
  const handleResetClaim = async () => {
    if (!participantToReset) return;
    try {
      setActionLoading(true);
      setError(null);

      const updates = {
        userId: '',
        email: '',
        photoURL: '',
        claimed: false,
        claimedAt: '',
      };

      await updateDoc(doc(db, 'exchanges', exchange.id, 'participants', participantToReset.id), updates);

      const updated = {
        ...participantToReset,
        userId: undefined,
        email: undefined,
        photoURL: undefined,
        claimed: false,
        claimedAt: undefined,
      };

      setLocalParticipants((prev) => prev.map((p) => p.id === participantToReset.id ? updated : p));
      playClickSound();
      setParticipantToReset(null);
    } catch (err: any) {
      console.error('Failed to reset claim:', err);
      setError(err.message || 'Failed to reset claim.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete/remove participant from roster
  const handleConfirmRemoveParticipant = async () => {
    if (!participantToRemove) return;
    try {
      setActionLoading(true);
      setError(null);

      const targetDocId = participantToRemove.id;
      const targetUserId = participantToRemove.userId;

      setLocalParticipants((prev) => prev.filter((p) => p.id !== targetDocId));

      await deleteDoc(doc(db, 'exchanges', exchange.id, 'participants', targetDocId));

      if (targetUserId) {
        try {
          await deleteDoc(doc(db, 'exchanges', exchange.id, 'assignments', targetUserId));
        } catch (e) {
          // ignore
        }
      }

      playClickSound();
      setParticipantToRemove(null);
    } catch (err: any) {
      console.error('Failed to remove participant:', err);
      setError(err.message || 'Failed to remove participant.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Secret Santa Draw
  const handlePerformDraw = async () => {
    if (!isOrganizer) return;
    if (localParticipants.length < 2) {
      setError('You need at least 2 participants on the roster to draw names!');
      return;
    }

    try {
      setDrawing(true);
      setError(null);

      const assignments = generateSecretSantaDraw(localParticipants);

      const batch = writeBatch(db);

      for (const assignment of assignments) {
        // Save assignment indexed by santaId (and santaParticipantId fallback)
        const assignRef = doc(db, 'exchanges', exchange.id, 'assignments', assignment.santaId);
        batch.set(assignRef, assignment);

        if (assignment.santaParticipantId && assignment.santaParticipantId !== assignment.santaId) {
          const assignPartRef = doc(db, 'exchanges', exchange.id, 'assignments', assignment.santaParticipantId);
          batch.set(assignPartRef, assignment);
        }
      }

      const exRef = doc(db, 'exchanges', exchange.id);
      batch.update(exRef, {
        status: 'drawn',
        isDrawUnlocked: true,
        drawnAt: new Date().toISOString(),
      });

      await batch.commit();

      playChimeSound();
      fireHolidayConfetti();
      setShowConfirmModal(false);
    } catch (err: any) {
      console.error('Error drawing Secret Santa names:', err);
      setError(err.message || 'Failed to draw names. Please try again.');
    } finally {
      setDrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Festive Roster Header */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎅</span>
              <h2 className="text-lg sm:text-xl font-black text-red-700 dark:text-red-400 tracking-tight">
                Holiday Guest Roster ({totalCount})
              </h2>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {claimedCount} of {totalCount} spots claimed by guests. {readyCount} have locked their wishlists! 🎁
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Add person button (organizer) */}
            {isOrganizer && !isDrawn && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowAddRosterModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Person to List</span>
              </button>
            )}

            {/* Invite share */}
            {onOpenShare && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenShare();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border-2 border-red-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-zinc-800 text-red-700 dark:text-red-400 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Invite Link</span>
              </button>
            )}

            {/* Organizer Unlock Draw button */}
            {isOrganizer && !isDrawn && (
              <button
                type="button"
                onClick={() => handleToggleDrawLock()}
                disabled={unlockLoading || totalCount < 2}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold border-2 transition-all cursor-pointer shadow-xs ${
                  totalCount < 2
                    ? 'border-zinc-200 dark:border-zinc-800 text-zinc-400 cursor-not-allowed opacity-60'
                    : isUnlocked
                    ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                    : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                {isUnlocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Re-lock Draw</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unlock Draw</span>
                  </>
                )}
              </button>
            )}

            {/* Organizer Draw Names button */}
            {isOrganizer && !isDrawn && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowConfirmModal(true);
                }}
                disabled={!isUnlocked || totalCount < 2}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black shadow-md transition-transform active:scale-95 ${
                  !isUnlocked || totalCount < 2
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border border-zinc-300 dark:border-zinc-700 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 text-white cursor-pointer shadow-red-500/30 animate-pulse-subtle'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Draw Secret Santa Names! 🎁</span>
              </button>
            )}

            {isDrawn && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-800 text-xs font-black">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Draw Complete! 🎅</span>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-950/70 border-2 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Participants Cards / List */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Responsive Table Wrapper */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[550px] divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
            <thead className="bg-red-50/70 dark:bg-zinc-800/70">
              <tr>
                <th className="px-4 sm:px-6 py-3.5 text-left font-black text-red-800 dark:text-red-300 uppercase tracking-wider">
                  Participant Name
                </th>
                <th className="px-4 sm:px-6 py-3.5 text-left font-black text-red-800 dark:text-red-300 uppercase tracking-wider">
                  Claim Status
                </th>
                <th className="px-4 sm:px-6 py-3.5 text-left font-black text-red-800 dark:text-red-300 uppercase tracking-wider">
                  Wishlist
                </th>
                <th className="px-4 sm:px-6 py-3.5 text-right font-black text-red-800 dark:text-red-300 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {localParticipants.map((person, idx) => {
                const isCurrentUser = person.userId === currentUserId;
                const isClaimed = Boolean(person.claimed || person.userId);
                const wishlistCount = person.wishlist?.length || 0;
                const emoji = FESTIVE_EMOJIS[idx % FESTIVE_EMOJIS.length];

                return (
                  <tr 
                    key={person.id} 
                    className={`transition-colors ${
                      isCurrentUser 
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 font-medium' 
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    {/* Name + Avatar */}
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {person.photoURL ? (
                          <img
                            src={person.photoURL}
                            alt={person.displayName}
                            className="w-9 h-9 rounded-2xl object-cover border-2 border-red-200 dark:border-zinc-700 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white font-black flex items-center justify-center text-sm shadow-2xs shrink-0">
                            {emoji}
                          </div>
                        )}
                        <div className="min-w-0 max-w-[180px] sm:max-w-[240px]">
                          <div className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                            <span className="truncate" title={person.displayName}>
                              {person.displayName}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold shrink-0">
                                You
                              </span>
                            )}
                            {person.isOrganizer && (
                              <span title="Organizer / Host">
                                <Shield className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                              </span>
                            )}
                          </div>
                          {isClaimed && person.email && (
                            <span className="text-[11px] text-zinc-400 truncate block">
                              {person.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Claim Status */}
                    <td className="px-4 sm:px-6 py-3.5">
                      {isClaimed ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Claimed</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Unclaimed</span>
                        </div>
                      )}
                    </td>

                    {/* Wishlist Status */}
                    <td className="px-4 sm:px-6 py-3.5 text-zinc-600 dark:text-zinc-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-red-500" />
                        <span>{wishlistCount} {wishlistCount === 1 ? 'gift idea' : 'gift ideas'}</span>
                        {person.isWishlistReady && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                            (Ready ✓)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Direct Claim Button if current user has not claimed and this spot is open */}
                        {!hasClaimed && !isClaimed && (
                          <button
                            type="button"
                            onClick={() => handleDirectClaim(person)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shadow-2xs transition-transform active:scale-95 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>I am {person.displayName}</span>
                          </button>
                        )}

                        {/* View Wishlist */}
                        {onViewWishlist && (
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              onViewWishlist(person);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold transition-colors cursor-pointer"
                            title="View Wishlist & Preferences"
                          >
                            <Eye className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="hidden sm:inline">Wishlist</span>
                          </button>
                        )}

                        {/* Organizer: Reset claim */}
                        {isOrganizer && isClaimed && !person.isOrganizer && !isDrawn && (
                          <button
                            type="button"
                            onClick={() => setParticipantToReset(person)}
                            className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="Reset claim so someone else can claim this name"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Organizer: Remove roster member */}
                        {isOrganizer && !isDrawn && (
                          <button
                            type="button"
                            onClick={() => setParticipantToRemove(person)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="Remove from roster"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add person to roster */}
      {showAddRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-4 border-red-500 rounded-3xl p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-black text-base text-red-700 dark:text-red-400 flex items-center gap-2">
                <span>🎅 Add Person to Holiday Roster</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRosterModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPersonToRoster} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Participant Full Name:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Kuya Mark, Auntie Connie, Chloe..."
                  value={newRosterName}
                  onChange={(e) => setNewRosterName(e.target.value)}
                  className="w-full bg-red-50/50 dark:bg-zinc-800 border-2 border-red-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-red-500"
                />
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Once added, this person can log in with the room code and claim their spot! 🎄
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRosterModal(false)}
                  className="px-4 py-2 rounded-2xl border border-zinc-300 text-xs font-bold hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addRosterLoading}
                  className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50"
                >
                  {addRosterLoading ? 'Adding...' : 'Add to List 🎁'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Draw */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-4 border-red-500 rounded-3xl p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 space-y-4">
            <div className="text-center space-y-2">
              <span className="text-4xl animate-jiggle inline-block">🎁</span>
              <h3 className="text-xl font-black text-red-700 dark:text-red-400">
                Ready to Draw Secret Santas?
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Names will be paired randomly without duplicates. Nobody will draw themselves.
                Once drawn, each participant can scratch to reveal their match!
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-2xl border-2 border-zinc-300 text-xs font-bold hover:bg-zinc-100 cursor-pointer"
              >
                Not Yet
              </button>
              <button
                type="button"
                onClick={handlePerformDraw}
                disabled={drawing}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-xs shadow-lg cursor-pointer disabled:opacity-50"
              >
                {drawing ? 'Drawing Names...' : '✨ Draw Names Now!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Reset Claim */}
      {participantToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border-2 border-amber-300 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Reset Claim for &quot;{participantToReset.displayName}&quot;?
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              This will unlink the current user account from this spot, making it available for someone else to claim.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setParticipantToReset(null)}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetClaim}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                {actionLoading ? 'Resetting...' : 'Reset Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Remove Roster Member */}
      {participantToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border-2 border-red-300 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-red-600">
              Remove &quot;{participantToRemove.displayName}&quot; from Roster?
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to remove this person from the holiday exchange list?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setParticipantToRemove(null)}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveParticipant}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                {actionLoading ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
