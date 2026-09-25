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
  Shuffle,
  Info
} from 'lucide-react';
import { db, doc, writeBatch, deleteDoc, updateDoc, collection, query, where, getDocs } from '../firebase';
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
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  exchange,
  participants,
  currentUserId,
  isOrganizer,
  onViewWishlist,
  onOpenShare,
  onLeaveExchange,
}) => {
  // Local participants state that syncs with props, but allows instant optimistic removals
  const [localParticipants, setLocalParticipants] = useState<Participant[]>(participants);

  useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);

  const [drawing, setDrawing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEarlyUnlockModal, setShowEarlyUnlockModal] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null);
  const [confirmLeaveSelf, setConfirmLeaveSelf] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readyCount = localParticipants.filter((p) => p.isWishlistReady).length;
  const totalCount = localParticipants.length;
  const isDrawn = exchange.status === 'drawn';
  const allReady = totalCount >= 2 && readyCount === totalCount;
  const isUnlocked = Boolean(exchange.isDrawUnlocked);

  // Toggle Draw Unlock state in Firestore (Organizer only)
  const handleToggleDrawLock = async (forceUnlock = false) => {
    if (!isOrganizer) return;
    try {
      setUnlockLoading(true);
      setError(null);

      // If unlocking and not everyone is ready, and forceUnlock is not confirmed yet:
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

  const handleConfirmRemoveParticipant = async () => {
    if (!participantToRemove) return;
    try {
      setActionLoading(true);
      setError(null);

      const targetUserId = participantToRemove.userId;
      const targetDocId = participantToRemove.id;
      const targetEmail = participantToRemove.email;

      // 1. Optimistically remove from local state immediately
      setLocalParticipants((prev) => 
        prev.filter((p) => p.userId !== targetUserId && p.id !== targetDocId)
      );

      // 2. Delete main participant doc
      if (targetDocId) {
        try {
          await deleteDoc(doc(db, 'exchanges', exchange.id, 'participants', targetDocId));
        } catch (e) {
          // continue
        }
      }
      if (targetUserId && targetUserId !== targetDocId) {
        try {
          await deleteDoc(doc(db, 'exchanges', exchange.id, 'participants', targetUserId));
        } catch (e) {
          // continue
        }
      }

      // 3. Clean any docs matching userId
      if (targetUserId) {
        const qUser = query(
          collection(db, 'exchanges', exchange.id, 'participants'), 
          where('userId', '==', targetUserId)
        );
        const snap = await getDocs(qUser);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }

      // 4. Clean any docs matching email
      if (targetEmail) {
        const qEmail = query(
          collection(db, 'exchanges', exchange.id, 'participants'), 
          where('email', '==', targetEmail)
        );
        const snapE = await getDocs(qEmail);
        for (const d of snapE.docs) {
          await deleteDoc(d.ref);
        }
      }

      // 5. Delete assignment doc if any
      try {
        await deleteDoc(doc(db, 'exchanges', exchange.id, 'assignments', targetUserId));
      } catch (e) {
        // ignore
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

  const handleConfirmLeaveSelf = async () => {
    try {
      setActionLoading(true);
      setError(null);

      // 1. Optimistically remove self from local state
      setLocalParticipants((prev) => prev.filter((p) => p.userId !== currentUserId));

      // 2. Notify parent handler to delete docs and cleanup storage
      if (onLeaveExchange) {
        await onLeaveExchange(exchange.id);
      } else {
        await deleteDoc(doc(db, 'exchanges', exchange.id, 'participants', currentUserId));
        try {
          await deleteDoc(doc(db, 'exchanges', exchange.id, 'assignments', currentUserId));
        } catch (e) {
          // ignore
        }
      }

      playClickSound();
      setConfirmLeaveSelf(false);
    } catch (err: any) {
      console.error('Failed to leave exchange:', err);
      setError(err.message || 'Failed to leave exchange.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteDraw = async () => {
    if (localParticipants.length < 2) {
      setError('You need at least 2 participants to run a Secret Santa draw.');
      return;
    }

    try {
      setDrawing(true);
      setError(null);

      // Execute uniform random derangement (super random, without duplicates, no self-draws)
      const assignments = generateSecretSantaDraw(localParticipants);
      const batch = writeBatch(db);

      assignments.forEach((assignment) => {
        const assignmentRef = doc(db, 'exchanges', exchange.id, 'assignments', assignment.santaId);
        batch.set(assignmentRef, assignment);
      });

      const exchangeRef = doc(db, 'exchanges', exchange.id);
      batch.update(exchangeRef, {
        status: 'drawn',
        drawnAt: new Date().toISOString(),
      });

      await batch.commit();
      playChimeSound();
      fireHolidayConfetti();
      setShowConfirmModal(false);
    } catch (err: any) {
      console.error('Failed to draw names:', err);
      setError(err.message || 'Failed to draw names.');
    } finally {
      setDrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action / Status Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Participants Roster</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                {totalCount} Joined
              </span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium flex items-center gap-1 ${
                allReady 
                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold' 
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}>
                {allReady ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>All {totalCount} participants have finalized wishlists!</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{readyCount} of {totalCount} ready ({totalCount - readyCount} still drafting wishlists)</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenShare && !isDrawn && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenShare();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                <span>Invite Friends</span>
              </button>
            )}

            {/* Organizer Unlock Toggle Button */}
            {isOrganizer && !isDrawn && (
              <button
                onClick={() => handleToggleDrawLock()}
                disabled={unlockLoading || totalCount < 2}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                  totalCount < 2
                    ? 'border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                    : isUnlocked
                    ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                    : allReady
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 font-bold'
                    : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200'
                }`}
                title={isUnlocked ? 'Re-lock the draw' : 'Unlock the draw button'}
              >
                {isUnlocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Re-lock Draw</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{allReady ? 'All Ready! Unlock Draw' : 'Unlock Draw'}</span>
                  </>
                )}
              </button>
            )}

            {/* Draw Names Button */}
            {isOrganizer && !isDrawn && (
              <button
                onClick={() => {
                  playClickSound();
                  setShowConfirmModal(true);
                }}
                disabled={!isUnlocked || totalCount < 2}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                  !isUnlocked || totalCount < 2
                    ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                    : 'bg-red-700 hover:bg-red-800 text-white shadow-md cursor-pointer animate-pulse-subtle'
                }`}
                title={
                  !isUnlocked
                    ? 'Draw is locked. Please wait for everyone to register and unlock the draw above.'
                    : 'Ready to draw names!'
                }
              >
                {!isUnlocked ? (
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>Draw Secret Santa Names</span>
              </button>
            )}

            {isDrawn && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Draw Complete — Secret Santas Active</span>
              </span>
            )}
          </div>
        </div>

        {/* Readiness Info Banner before draw */}
        {!isDrawn && (
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            isUnlocked
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
              : !allReady
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
              : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
          }`}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">
                {isUnlocked
                  ? '🔓 Draw is Unlocked!'
                  : totalCount < 2
                  ? '🔒 Draw Locked: Waiting for more participants'
                  : !allReady
                  ? '🔒 Draw Locked: Waiting for everyone to finish registering'
                  : '🔒 Draw Locked: Ready for organizer to unlock'}
              </p>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {isUnlocked
                  ? 'The organizer has unlocked the draw button. Names will be paired in a super-random, unbiased Secret Santa derangement without duplicates!'
                  : totalCount < 2
                  ? 'At least 2 participants must join before the draw can be unlocked.'
                  : !allReady
                  ? `${totalCount - readyCount} participant(s) are still drafting their wishlist. Once all participants click "Mark Ready" (or the organizer unlocks), the draw can be run!`
                  : 'All participants have marked their wishlists as ready! The organizer can now click "Unlock Draw" to begin the Secret Santa match.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Participants Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-800/60">
            <tr>
              <th className="px-4 py-3 text-left font-bold text-zinc-600 dark:text-zinc-400">Participant</th>
              <th className="px-4 py-3 text-left font-bold text-zinc-600 dark:text-zinc-400">Wishlist</th>
              <th className="px-4 py-3 text-left font-bold text-zinc-600 dark:text-zinc-400">Status</th>
              <th className="px-4 py-3 text-right font-bold text-zinc-600 dark:text-zinc-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
            {localParticipants.map((person) => {
              const isCurrentUser = person.userId === currentUserId;
              const wishlistCount = person.wishlist?.length || 0;

              return (
                <tr key={person.id || person.userId} className={isCurrentUser ? 'bg-amber-50/50 dark:bg-amber-950/20' : undefined}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      {person.photoURL ? (
                        <img
                          src={person.photoURL}
                          alt={person.displayName}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-800 text-white font-bold flex items-center justify-center text-xs">
                          {person.displayName ? person.displayName.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>{person.displayName || 'Anonymous Member'}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold">
                              You
                            </span>
                          )}
                          {person.isOrganizer && (
                            <span title="Organizer">
                              <Shield className="w-3 h-3 text-red-600 dark:text-red-400" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{person.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400 font-medium">
                    {wishlistCount} {wishlistCount === 1 ? 'gift idea' : 'gift ideas'}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {person.isWishlistReady ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Ready 🎁</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Drafting ✍️</span>
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewWishlist && (
                        <button
                          onClick={() => {
                            playClickSound();
                            onViewWishlist(person);
                          }}
                          className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View List</span>
                        </button>
                      )}

                      {/* Participant's own Leave button */}
                      {isCurrentUser && (
                        <button
                          onClick={() => setConfirmLeaveSelf(true)}
                          className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          title="Leave this gift exchange"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Leave</span>
                        </button>
                      )}

                      {/* Organizer Remove participant button (before draw) */}
                      {isOrganizer && !isDrawn && !isCurrentUser && (
                        <button
                          onClick={() => setParticipantToRemove(person)}
                          className="inline-flex items-center gap-1 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-zinc-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-800 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          title={`Remove ${person.displayName} from this exchange`}
                        >
                          <UserMinus className="w-3 h-3" />
                          <span className="hidden sm:inline">Remove</span>
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

      {/* Confirmation Modal - Early Draw Unlock Warning */}
      {showEarlyUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl max-w-sm w-full space-y-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Unlock Draw Button Early?
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                <strong className="text-amber-700 dark:text-amber-300 font-semibold">{totalCount - readyCount} participant(s)</strong> have not marked their wishlists as ready yet.
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                If you unlock now, you will be able to draw names immediately. Participants can still edit wishlists after the draw.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowEarlyUnlockModal(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Keep Waiting
              </button>
              <button
                type="button"
                disabled={unlockLoading}
                onClick={() => handleToggleDrawLock(true)}
                className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {unlockLoading ? 'Unlocking...' : 'Unlock Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Super Random Draw */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl max-w-md w-full space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 flex items-center justify-center">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Ready to Draw Secret Santa Names!
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                You are about to draw names for <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{totalCount} participants</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 space-y-1.5">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>No duplicates:</strong> Everyone gives 1 gift and receives 1 gift.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>No self-draws:</strong> No one can ever be matched with themselves.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Super random:</strong> Uniform derangement algorithm where every possible valid permutation is equally likely (pairs are possible by chance, never forced).</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={drawing}
                onClick={handleExecuteDraw}
                className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{drawing ? 'Drawing Names...' : 'Shuffle & Confirm Draw'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - User Leaving Exchange */}
      {confirmLeaveSelf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl max-w-sm w-full space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Leave this Gift Exchange?
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                Your name, wishlist, and participation will be completely removed from &quot;{exchange.title}&quot;. You will not give or receive gifts in this exchange.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmLeaveSelf(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmLeaveSelf}
                className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Leaving...' : 'Yes, Leave Exchange'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Organizer Removing Participant */}
      {participantToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl max-w-sm w-full space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 flex items-center justify-center">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Remove {participantToRemove.displayName}?
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                This participant and their wishlist will be permanently removed from this gift exchange roster.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setParticipantToRemove(null)}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmRemoveParticipant}
                className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Removing...' : 'Remove Participant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

