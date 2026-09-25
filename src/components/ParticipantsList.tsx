import React, { useState } from 'react';
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
  UserMinus
} from 'lucide-react';
import { db, doc, writeBatch, deleteDoc } from '../firebase';
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
  const [drawing, setDrawing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null);
  const [confirmLeaveSelf, setConfirmLeaveSelf] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readyCount = participants.filter((p) => p.isWishlistReady).length;
  const totalCount = participants.length;
  const isDrawn = exchange.status === 'drawn';
  const allReady = totalCount >= 2 && readyCount === totalCount;

  const handleConfirmRemoveParticipant = async () => {
    if (!participantToRemove) return;
    try {
      setActionLoading(true);
      setError(null);
      await deleteDoc(doc(db, 'exchanges', exchange.id, 'participants', participantToRemove.userId));
      try {
        await deleteDoc(doc(db, 'exchanges', exchange.id, 'assignments', participantToRemove.userId));
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
    if (participants.length < 2) {
      setError('You need at least 2 participants to run a Secret Santa draw.');
      return;
    }

    try {
      setDrawing(true);
      setError(null);

      const assignments = generateSecretSantaDraw(participants);
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
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Participants</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
              {totalCount} Joined
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {readyCount} of {totalCount} participants have marked their wishlist as ready.
          </p>
        </div>

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

          {isOrganizer && !isDrawn && (
            <button
              onClick={() => {
                playClickSound();
                setShowConfirmModal(true);
              }}
              disabled={totalCount < 2}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                totalCount < 2
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                  : 'bg-red-700 hover:bg-red-800 text-white shadow-sm'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
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
            {participants.map((person) => {
              const isCurrentUser = person.userId === currentUserId;
              const wishlistCount = person.wishlist?.length || 0;

              return (
                <tr key={person.id} className={isCurrentUser ? 'bg-amber-50/50 dark:bg-amber-950/20' : undefined}>
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
                          {person.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>{person.displayName}</span>
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

      {/* Confirmation Modal - Draw */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Draw Secret Santa Names?
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Everyone will be paired using a pure random single-cycle derangement. Each person gives
              and receives one gift. No one can draw themselves, and assignments remain private to each Santa!
            </p>

            {!allReady && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                Note: {totalCount - readyCount} participant(s) haven&apos;t marked their wishlist as ready yet. They can still edit after the draw.
              </div>
            )}

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
                className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {drawing ? 'Drawing...' : 'Confirm Draw'}
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
                Your name, wishlist, and participation will be removed from &quot;{exchange.title}&quot;. You will not give or receive gifts in this exchange.
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
