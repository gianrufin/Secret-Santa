import React, { useState, useEffect, useMemo } from 'react';
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
  UserCheck,
  ArrowDownAZ,
  ArrowUpZA,
  Search,
  Layers,
  Filter,
  X
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

  // Grouping, Sorting, and Search States
  type GroupMode = 'claim-status' | 'none' | 'wishlist-status';
  type SortDirection = 'asc' | 'desc';
  type StatusFilter = 'all' | 'claimed' | 'unclaimed';

  const [groupMode, setGroupMode] = useState<GroupMode>('claim-status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Alphabetical comparator with support for direction
  const sortAlphabetically = (a: Participant, b: Participant) => {
    const comp = a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
    return sortDirection === 'asc' ? comp : -comp;
  };

  // Filtered by search and status filter
  const filteredParticipants = useMemo(() => {
    return localParticipants.filter((p) => {
      const isClaimed = Boolean(p.claimed || p.userId);
      if (statusFilter === 'claimed' && !isClaimed) return false;
      if (statusFilter === 'unclaimed' && isClaimed) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.displayName.toLowerCase().includes(q);
        const matchesEmail = p.email ? p.email.toLowerCase().includes(q) : false;
        return matchesName || matchesEmail;
      }
      return true;
    });
  }, [localParticipants, statusFilter, searchQuery]);

  interface RosterGroup {
    id: string;
    title: string;
    type: 'claimed' | 'unclaimed' | 'ready' | 'drafting' | 'all';
    badge: string;
    badgeColor: string;
    icon: 'check' | 'clock' | 'gift' | 'users';
    sortNote: string;
    description: string;
    emptyText: string;
    items: Participant[];
  }

  const rosterGroups = useMemo<RosterGroup[]>(() => {
    if (groupMode === 'claim-status') {
      const claimedList = filteredParticipants
        .filter((p) => Boolean(p.claimed || p.userId))
        .sort(sortAlphabetically);

      const unclaimedList = filteredParticipants
        .filter((p) => !p.claimed && !p.userId)
        .sort(sortAlphabetically);

      const groups: RosterGroup[] = [];

      if (statusFilter !== 'unclaimed') {
        groups.push({
          id: 'claimed-group',
          title: 'Claimed Guests',
          type: 'claimed',
          badge: `${claimedList.length} Claimed`,
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
          icon: 'check',
          sortNote: `Alphabetical (${sortDirection === 'asc' ? 'A → Z' : 'Z → A'})`,
          description: 'Guests who have joined and claimed their name on the roster.',
          emptyText: searchQuery ? 'No claimed guests match your search.' : 'No guests have claimed their spot yet.',
          items: claimedList,
        });
      }

      if (statusFilter !== 'claimed') {
        groups.push({
          id: 'unclaimed-group',
          title: 'Unclaimed Names',
          type: 'unclaimed',
          badge: `${unclaimedList.length} Open`,
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          icon: 'clock',
          sortNote: `Alphabetical (${sortDirection === 'asc' ? 'A → Z' : 'Z → A'})`,
          description: 'Names waiting to be claimed by guests before the lock deadline.',
          emptyText: searchQuery ? 'No unclaimed names match your search.' : '🎉 All spots on the roster have been claimed!',
          items: unclaimedList,
        });
      }

      return groups;
    }

    if (groupMode === 'wishlist-status') {
      const readyList = filteredParticipants
        .filter((p) => p.isWishlistReady)
        .sort(sortAlphabetically);

      const draftingList = filteredParticipants
        .filter((p) => !p.isWishlistReady)
        .sort(sortAlphabetically);

      return [
        {
          id: 'ready-group',
          title: 'Wishlists Locked & Ready',
          type: 'ready',
          badge: `${readyList.length} Ready`,
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
          icon: 'gift',
          sortNote: `Alphabetical (${sortDirection === 'asc' ? 'A → Z' : 'Z → A'})`,
          description: 'Participants whose wishlists are completed and ready for their Santa.',
          emptyText: searchQuery ? 'No ready wishlists match your search.' : 'No wishlists marked ready yet.',
          items: readyList,
        },
        {
          id: 'drafting-group',
          title: 'Still Adding Wishlist Ideas',
          type: 'drafting',
          badge: `${draftingList.length} Drafting`,
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          icon: 'clock',
          sortNote: `Alphabetical (${sortDirection === 'asc' ? 'A → Z' : 'Z → A'})`,
          description: 'Participants still browsing and adding holiday gift ideas.',
          emptyText: searchQuery ? 'No drafting participants match your search.' : 'Everyone has locked their wishlists! 🎁',
          items: draftingList,
        },
      ];
    }

    // Flat alphabetical view
    const allSorted = [...filteredParticipants].sort(sortAlphabetically);
    return [
      {
        id: 'all-group',
        title: 'All Roster Participants',
        type: 'all',
        badge: `${allSorted.length} Participants`,
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300 dark:border-red-700',
        icon: 'users',
        sortNote: `Alphabetical (${sortDirection === 'asc' ? 'A → Z' : 'Z → A'})`,
        description: 'Complete list of all participants on the holiday exchange roster.',
        emptyText: searchQuery ? 'No participants match your search query.' : 'No participants found on this roster.',
        items: allSorted,
      },
    ];
  }, [filteredParticipants, groupMode, sortDirection, statusFilter, searchQuery]);

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

      // If Secret Santa was already drawn ahead, link assignment for this claimed participant!
      if (exchange.status === 'drawn') {
        try {
          const assignSnapshot = await getDocs(
            collection(db, 'exchanges', exchange.id, 'assignments')
          );

          for (const docSnap of assignSnapshot.docs) {
            const data = docSnap.data();

            // When this person is the Santa
            if (
              data.santaParticipantId === person.id ||
              docSnap.id === person.id ||
              (!data.santaId && data.santaName?.toLowerCase() === person.displayName.toLowerCase())
            ) {
              const updatedAssignment = {
                ...data,
                santaId: currentUserId,
                santaParticipantId: person.id,
              };

              await updateDoc(doc(db, 'exchanges', exchange.id, 'assignments', docSnap.id), {
                santaId: currentUserId,
              });

              await setDoc(
                doc(db, 'exchanges', exchange.id, 'assignments', currentUserId),
                updatedAssignment
              );
            }

            // When this person is the recipient
            if (
              data.recipientParticipantId === person.id ||
              (!data.recipientId && data.recipientName?.toLowerCase() === person.displayName.toLowerCase())
            ) {
              await updateDoc(doc(db, 'exchanges', exchange.id, 'assignments', docSnap.id), {
                recipientId: currentUserId,
              });
            }
          }
        } catch (assignErr) {
          console.error('Error linking assignment in direct claim:', assignErr);
        }
      }

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

  // Helper to render individual participant row consistently across groups
  const renderParticipantRow = (person: Participant, idx: number) => {
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
  };

  return (
    <div className="space-y-6">
      {/* Prominent Draw Ahead Prompt Banner when list is ready */}
      {!isDrawn && isOrganizer && totalCount >= 2 && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-3xl p-5 sm:p-6 text-white shadow-xl space-y-3 relative overflow-hidden animate-gentle-bounce-once">
          <div className="absolute top-2 right-4 text-3xl opacity-30 select-none">✨🎅</div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-amber-200 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Guest List is Ready! ({totalCount} Participants)</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>🎲 Ready to Draw Names Ahead? 🎁</span>
              </h3>
              <p className="text-xs sm:text-sm text-red-50 leading-relaxed font-medium">
                The holiday list is complete! You can <strong>draw pairs ahead of time right now</strong>. 
                Even if some people haven&apos;t claimed their names yet, they can still join and claim their spot 
                before the wishlist lock deadline
                {exchange.registrationDeadline ? ` (${exchange.registrationDeadline})` : ''}.
                Once they sign up, their person to give gifts to will already be waiting for them immediately! 🎄
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowConfirmModal(true);
              }}
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-red-700 hover:bg-amber-50 font-black text-xs sm:text-sm shadow-xl transition-transform active:scale-95 cursor-pointer ring-4 ring-white/30"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Draw Secret Santa Ahead! 🎁</span>
            </button>
          </div>
        </div>
      )}

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
              {exchange.registrationDeadline && (
                <span className="ml-1 text-amber-700 dark:text-amber-400 font-semibold">
                  (Lock: {exchange.registrationDeadline})
                </span>
              )}
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

            {/* Organizer Draw Ahead button */}
            {isOrganizer && !isDrawn && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowConfirmModal(true);
                }}
                disabled={totalCount < 2}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black shadow-md transition-transform active:scale-95 ${
                  totalCount < 2
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border border-zinc-300 dark:border-zinc-700 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 text-white cursor-pointer shadow-red-500/30 animate-pulse-subtle'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Draw Secret Santa Ahead! 🎁</span>
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

        {/* Search, Grouping, and Sort Toolbar */}
        <div className="pt-3 border-t border-red-100 dark:border-zinc-800 space-y-3">
          {/* Top row: Search input + Sort Direction toggle */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search participant by name or email..."
                className="w-full pl-9.5 pr-8 py-2 text-xs font-semibold rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Alphabetical Sort Direction Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer shadow-2xs border border-zinc-200 dark:border-zinc-700 shrink-0"
                title={`Alphabetical sort: currently ${sortDirection === 'asc' ? 'A to Z' : 'Z to A'}. Click to reverse.`}
              >
                {sortDirection === 'asc' ? (
                  <ArrowDownAZ className="w-4 h-4 text-red-600 dark:text-red-400" />
                ) : (
                  <ArrowUpZA className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <span>Alphabetical: <strong>{sortDirection === 'asc' ? 'A → Z' : 'Z → A'}</strong></span>
              </button>
            </div>
          </div>

          {/* Bottom row: Grouping Selector + Status Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Grouping Mode Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mr-1">
                <Layers className="w-3.5 h-3.5 text-zinc-400" /> Group by:
              </span>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setGroupMode('claim-status');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs ${
                  groupMode === 'claim-status'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                👥 Claim Status (A–Z)
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setGroupMode('none');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs ${
                  groupMode === 'none'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                🔤 All Alphabetical (Flat)
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setGroupMode('wishlist-status');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs ${
                  groupMode === 'wishlist-status'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                🎁 Wishlist Status (A–Z)
              </button>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setStatusFilter('all');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setStatusFilter('claimed');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === 'claimed'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Claimed ({claimedCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setStatusFilter('unclaimed');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === 'unclaimed'
                    ? 'bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Unclaimed ({totalCount - claimedCount})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Participants Grouped / Sorted Cards */}
      <div className="space-y-6">
        {rosterGroups.map((group) => {
          return (
            <div
              key={group.id}
              className="bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm"
            >
              {/* Group Section Header */}
              <div
                className={`px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                  group.type === 'claimed' || group.type === 'ready'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30'
                    : group.type === 'unclaimed' || group.type === 'drafting'
                    ? 'bg-amber-50/80 dark:bg-amber-950/30'
                    : 'bg-red-50/70 dark:bg-zinc-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shadow-2xs shrink-0 ${
                      group.type === 'claimed' || group.type === 'ready'
                        ? 'bg-emerald-600 text-white'
                        : group.type === 'unclaimed' || group.type === 'drafting'
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {group.icon === 'check' && <Check className="w-4 h-4" />}
                    {group.icon === 'clock' && <Clock className="w-4 h-4" />}
                    {group.icon === 'gift' && <Gift className="w-4 h-4" />}
                    {group.icon === 'users' && <Users className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {group.title}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${group.badgeColor}`}>
                        {group.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {group.description}
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-white/90 dark:bg-zinc-800/90 px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-700 w-fit shrink-0 shadow-2xs">
                  <ArrowDownAZ className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>{group.sortNote}</span>
                </div>
              </div>

              {/* Group items table or empty message */}
              {group.items.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <span className="text-2xl block">
                    {group.type === 'unclaimed' ? '🎉' : '📭'}
                  </span>
                  <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {group.emptyText}
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[550px] divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                    <thead className="bg-zinc-50/80 dark:bg-zinc-800/50">
                      <tr>
                        <th className="px-4 sm:px-6 py-2.5 text-left font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                          Participant Name
                        </th>
                        <th className="px-4 sm:px-6 py-2.5 text-left font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                          Claim Status
                        </th>
                        <th className="px-4 sm:px-6 py-2.5 text-left font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                          Wishlist
                        </th>
                        <th className="px-4 sm:px-6 py-2.5 text-right font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                      {group.items.map((person, idx) => renderParticipantRow(person, idx))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
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
                Draw Secret Santa Ahead? 🎅
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                The guest list has <strong>{totalCount} participants</strong>. You can lock in the Secret Santa draw right now!
              </p>
            </div>

            {/* Breakdown Card */}
            <div className="bg-red-50/70 dark:bg-zinc-800/80 rounded-2xl p-4 border border-red-200 dark:border-zinc-700 space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="text-zinc-600 dark:text-zinc-400">Total Participants on Roster:</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-black">{totalCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Claimed by Guests:
                </span>
                <span className="font-bold text-emerald-800 dark:text-emerald-300">{claimedCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-amber-800 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Still Unclaimed:
                </span>
                <span className="font-bold text-amber-900 dark:text-amber-300">{totalCount - claimedCount}</span>
              </div>
              {exchange.registrationDeadline && (
                <div className="pt-2 border-t border-red-100 dark:border-zinc-700 flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 font-medium flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" /> Wishlist Lock Deadline:
                  </span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{exchange.registrationDeadline}</span>
                </div>
              )}
            </div>

            {/* Reassurance text */}
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>💡 Drawing Ahead is 100% Safe:</span>
              </p>
              <p className="leading-relaxed">
                {totalCount - claimedCount > 0 ? (
                  <>
                    Even though <strong>{totalCount - claimedCount} participant(s)</strong> haven&apos;t claimed their name yet, 
                    they can claim anytime before the wishlist lock deadline. 
                    <strong> As soon as they sign up, their assigned person will already be ready for them!</strong>
                  </>
                ) : (
                  'All participants have claimed their spots and will be able to reveal their match instantly!'
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
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
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 text-white font-black text-xs shadow-lg cursor-pointer disabled:opacity-50 transition-transform active:scale-95"
              >
                {drawing ? 'Drawing Names...' : '✨ Draw Names Ahead Now! 🎁'}
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
