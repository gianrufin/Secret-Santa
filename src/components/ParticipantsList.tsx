import React, { useState } from 'react';
import { 
  Users, 
  Check, 
  Clock, 
  AlertCircle, 
  Eye,
  Shield,
  Sparkles
} from 'lucide-react';
import { db, doc, writeBatch } from '../firebase';
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
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  exchange,
  participants,
  currentUserId,
  isOrganizer,
  onViewWishlist,
}) => {
  const [drawing, setDrawing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readyCount = participants.filter((p) => p.isWishlistReady).length;
  const totalCount = participants.length;
  const isDrawn = exchange.status === 'drawn';
  const allReady = totalCount >= 2 && readyCount === totalCount;

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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
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
    </div>
  );
};
