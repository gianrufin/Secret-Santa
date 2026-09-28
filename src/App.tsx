/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  auth, 
  db, 
  doc, 
  deleteDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs,
  setDoc,
  User 
} from './firebase';
import { Exchange, Participant, Assignment, getCurrencySymbol } from './types';
import { Navbar } from './components/Navbar';
import { HeroLogin } from './components/HeroLogin';
import { CreateExchangeModal } from './components/CreateExchangeModal';
import { JoinExchangeModal } from './components/JoinExchangeModal';
import { ClaimNameCard } from './components/ClaimNameCard';
import { ExchangeHeader } from './components/ExchangeHeader';
import { WishlistEditor } from './components/WishlistEditor';
import { ParticipantsList } from './components/ParticipantsList';
import { SecretSantaReveal } from './components/SecretSantaReveal';
import { ViewWishlistModal } from './components/ViewWishlistModal';
import { SettingsModal } from './components/SettingsModal';
import { QuickShareModal } from './components/QuickShareModal';
import { AppSkeleton, ParticipantsSkeleton } from './components/SkeletonLoader';
import { Plus, Share2, Sparkles, UserCheck } from 'lucide-react';
import { playClickSound } from './utils/audio';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [exchangesLoading, setExchangesLoading] = useState(false);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('secretsanta_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode class to root
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('secretsanta_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('secretsanta_theme', 'light');
    }
  }, [isDarkMode]);

  // Exchanges state
  const [userExchanges, setUserExchanges] = useState<Exchange[]>([]);
  const [currentExchange, setCurrentExchange] = useState<Exchange | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [santaNotesCount, setSantaNotesCount] = useState<number>(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [inspectParticipant, setInspectParticipant] = useState<Participant | null>(null);

  // Dedicated Section View: 'match' | 'wishlist' | 'participants' | 'details'
  const [activeSection, setActiveSection] = useState<'match' | 'wishlist' | 'participants' | 'details'>('wishlist');

  // 1. Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch user's exchanges
  useEffect(() => {
    if (!user) {
      setUserExchanges([]);
      setCurrentExchange(null);
      return;
    }

    const loadExchanges = async () => {
      try {
        setExchangesLoading(true);
        const qOrg = query(collection(db, 'exchanges'), where('organizerId', '==', user.uid));
        const orgSnaps = await getDocs(qOrg);
        const orgList = orgSnaps.docs.map((d) => d.data() as Exchange);

        const savedIds: string[] = JSON.parse(localStorage.getItem(`joined_exchanges_${user.uid}`) || '[]');
        const extraExchanges: Exchange[] = [];

        for (const id of savedIds) {
          if (!orgList.some((ex) => ex.id === id)) {
            const snap = await getDocs(query(collection(db, 'exchanges'), where('id', '==', id)));
            if (!snap.empty) {
              extraExchanges.push(snap.docs[0].data() as Exchange);
            }
          }
        }

        const combined = [...orgList, ...extraExchanges];
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUserExchanges(combined);

        // Check URL for ?code=...
        const urlParams = new URLSearchParams(window.location.search);
        const codeParam = urlParams.get('code');
        if (codeParam) {
          try {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('code');
            window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.searchParams.toString() ? '?' + cleanUrl.searchParams.toString() : ''));
          } catch (e) {
            // ignore
          }

          const matchCode = combined.find((ex) => ex.code.toUpperCase() === codeParam.toUpperCase());
          let foundEx: Exchange | null = null;
          if (matchCode) {
            foundEx = matchCode;
          } else {
            const snap = await getDocs(query(collection(db, 'exchanges'), where('code', '==', codeParam.toUpperCase())));
            if (!snap.empty) {
              foundEx = snap.docs[0].data() as Exchange;
              saveExchangeToStorage(foundEx.id);
            }
          }
          if (foundEx) {
            setCurrentExchange(foundEx);
          }
        } else if (combined.length > 0 && !currentExchange) {
          setCurrentExchange(combined[0]);
        }
      } catch (err) {
        console.error('Failed to load exchanges:', err);
      } finally {
        setExchangesLoading(false);
      }
    };

    loadExchanges();
  }, [user]);

  const saveExchangeToStorage = (exchangeId: string) => {
    if (!user) return;
    try {
      const saved: string[] = JSON.parse(localStorage.getItem(`joined_exchanges_${user.uid}`) || '[]');
      if (!saved.includes(exchangeId)) {
        saved.push(exchangeId);
        localStorage.setItem(`joined_exchanges_${user.uid}`, JSON.stringify(saved));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Realtime subscription to current exchange
  useEffect(() => {
    if (!currentExchange?.id) {
      setParticipants([]);
      setAllAssignments([]);
      return;
    }

    const unsubExchange = onSnapshot(doc(db, 'exchanges', currentExchange.id), (docSnap) => {
      if (docSnap.exists()) {
        const updated = docSnap.data() as Exchange;
        setCurrentExchange(updated);
        setUserExchanges((prev) =>
          prev.map((ex) => (ex.id === updated.id ? updated : ex))
        );
      }
    });

    const unsubParticipants = onSnapshot(
      collection(db, 'exchanges', currentExchange.id, 'participants'),
      (snapshot) => {
        const list: Participant[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Participant));
        setParticipants(list);
      }
    );

    const unsubAssignments = onSnapshot(
      collection(db, 'exchanges', currentExchange.id, 'assignments'),
      (snapshot) => {
        const list: Assignment[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Assignment));
        setAllAssignments(list);
      }
    );

    let unsubSantaNotes = () => {};
    if (user) {
      const qNotes = query(
        collection(db, 'exchanges', currentExchange.id, 'messages'),
        where('recipientId', '==', user.uid)
      );
      unsubSantaNotes = onSnapshot(
        qNotes,
        (snap) => {
          setSantaNotesCount(snap.size);
        },
        (err) => {
          console.error('Error listening to Santa notes:', err);
        }
      );
    }

    return () => {
      unsubExchange();
      unsubParticipants();
      unsubAssignments();
      unsubSantaNotes();
    };
  }, [currentExchange?.id, user?.uid]);

  const handleLeaveExchange = async (exchangeId: string) => {
    if (!user) return;
    try {
      localStorage.setItem(`left_exchange_${exchangeId}_${user.uid}`, 'true');

      // Optimistically unlink currentUser from participant slot
      const myPart = participants.find((p) => p.userId === user.uid);
      if (myPart) {
        try {
          await deleteDoc(doc(db, 'exchanges', exchangeId, 'participants', myPart.id));
        } catch (e) {
          // ignore
        }
      }

      const storageKey = `joined_exchanges_${user.uid}`;
      const saved: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const filtered = saved.filter((id) => id !== exchangeId);
      localStorage.setItem(storageKey, JSON.stringify(filtered));

      const remaining = userExchanges.filter((ex) => ex.id !== exchangeId);
      setUserExchanges(remaining);
      if (currentExchange?.id === exchangeId) {
        setCurrentExchange(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Failed to leave exchange:', err);
    }
  };

  // Derive current participant (the slot claimed by this user)
  const currentParticipant = participants.find((p) => p.userId === user?.uid);
  const isOrganizer = currentExchange?.organizerId === user?.uid;
  const isDrawn = currentExchange?.status === 'drawn';
  const hasClaimed = Boolean(currentParticipant);

  // Derive assignment with robust multi-field matching
  const myAssignment = allAssignments.find((a) => {
    if (user?.uid && a.santaId === user.uid) return true;
    if (currentParticipant && a.santaParticipantId === currentParticipant.id) return true;
    if (currentParticipant && a.santaId === currentParticipant.id) return true;
    if (currentParticipant && a.santaName?.trim().toLowerCase() === currentParticipant.displayName?.trim().toLowerCase()) return true;
    return false;
  }) || null;

  // Derive recipient with fallback to display name matching
  const recipientParticipant = myAssignment
    ? participants.find((p) => {
        if (myAssignment.recipientParticipantId && p.id === myAssignment.recipientParticipantId) return true;
        if (p.userId && (p.userId === myAssignment.recipientId || p.userId === myAssignment.recipientParticipantId)) return true;
        if (p.id === myAssignment.recipientId) return true;
        if (p.displayName?.trim().toLowerCase() === myAssignment.recipientName?.trim().toLowerCase()) return true;
        return false;
      }) || null
    : null;

  if (authLoading || (user && exchangesLoading && !currentExchange)) {
    return <AppSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#fef7f2] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors w-full max-w-full overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar
        user={user}
        currentExchange={currentExchange}
        userExchanges={userExchanges}
        onSelectExchange={(ex) => {
          setCurrentExchange(ex);
          setActiveSection(ex.status === 'drawn' ? 'match' : 'wishlist');
        }}
        onCreateNew={() => setShowCreateModal(true)}
        onJoinCode={() => setShowJoinModal(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={(val) => setIsDarkMode(val)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 overflow-x-hidden">
        {!user ? (
          <HeroLogin />
        ) : !currentExchange ? (
          /* Empty state: create or join */
          <div className="max-w-md mx-auto py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red-600 to-rose-700 text-white mx-auto flex items-center justify-center mb-4 text-3xl shadow-lg animate-gentle-bounce">
              🎄
            </div>
            <h2 className="text-2xl font-black text-red-700 dark:text-red-400 mb-1">
              Welcome to Secret Santa! 🎅
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              Create a new holiday party exchange with a guest roster, or join an existing party with a room code!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 text-white text-xs sm:text-sm font-black shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Exchange 🎁</span>
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-red-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 text-red-700 dark:text-red-300 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                <span>Join with Room Code 🗝️</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Minimal Sub-header: Event title + Room code */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-red-100 dark:border-zinc-800">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-red-700 dark:text-red-400 tracking-tight flex items-center gap-2 truncate">
                  <span className="truncate">{currentExchange.title}</span>
                  <span className="text-lg shrink-0">🎄</span>
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                  <span>Budget: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{currentExchange.budget}</strong></span>
                  <span>•</span>
                  <span>Event: {currentExchange.exchangeDate}</span>
                  {currentExchange.registrationDeadline && (
                    <>
                      <span>•</span>
                      <span className="text-amber-800 dark:text-amber-400 font-semibold">
                        Lock: {currentExchange.registrationDeadline}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">Code:</span>
                <span className="font-mono text-xs sm:text-sm font-black bg-red-100 dark:bg-zinc-800 text-red-800 dark:text-red-300 px-2.5 py-1 rounded-xl border border-red-200 dark:border-zinc-700">
                  {currentExchange.code}
                </span>
                <button
                  onClick={() => {
                    playClickSound();
                    setShowShareModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 text-white text-xs font-black shadow-xs transition-transform active:scale-95 cursor-pointer ml-1"
                  title="Share Direct Party Link & QR Code"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Party</span>
                </button>
              </div>
            </div>

            {/* If the current user has NOT claimed their spot yet, show ClaimNameCard prominently! */}
            {!hasClaimed && (
              <ClaimNameCard
                exchange={currentExchange}
                participants={participants}
                currentUser={user}
                onClaimed={() => {
                  setActiveSection(isDrawn ? 'match' : 'wishlist');
                }}
              />
            )}

            {/* If user is claimed, show a cute bubbly badge */}
            {hasClaimed && currentParticipant && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-900/60 text-xs font-bold text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 truncate">
                  <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">
                    Playing as: <strong>{currentParticipant.displayName}</strong> 🎅
                  </span>
                </div>
                <button
                  onClick={() => setActiveSection('participants')}
                  className="text-[11px] text-amber-800 dark:text-amber-300 hover:underline shrink-0 ml-2"
                >
                  View Roster
                </button>
              </div>
            )}

            {/* Flat Section Navigation Tabs */}
            <div className="flex items-center gap-1.5 border-b-2 border-red-100 dark:border-zinc-800 pb-2 overflow-x-auto">
              {isDrawn && myAssignment && (
                <button
                  onClick={() => {
                    playClickSound();
                    setActiveSection('match');
                  }}
                  className={`py-2 px-3.5 text-xs font-black rounded-2xl transition-all whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                    activeSection === 'match'
                      ? 'bg-red-600 text-white shadow-sm scale-105'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>🎁 My Secret Santa Match</span>
                  {santaNotesCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-600 text-white font-bold">
                      {santaNotesCount} note{santaNotesCount > 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  playClickSound();
                  setActiveSection('wishlist');
                }}
                className={`py-2 px-3.5 text-xs font-black rounded-2xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeSection === 'wishlist'
                    ? 'bg-red-600 text-white shadow-sm scale-105'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-zinc-800'
                }`}
              >
                📝 My Wishlist
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  setActiveSection('participants');
                }}
                className={`py-2 px-3.5 text-xs font-black rounded-2xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeSection === 'participants'
                    ? 'bg-red-600 text-white shadow-sm scale-105'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-zinc-800'
                }`}
              >
                👥 Guest Roster ({participants.length})
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  setActiveSection('details');
                }}
                className={`py-2 px-3.5 text-xs font-black rounded-2xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeSection === 'details'
                    ? 'bg-red-600 text-white shadow-sm scale-105'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-zinc-800'
                }`}
              >
                📅 Event Details
              </button>
            </div>

            {/* Content for Active Section */}
            <div className="pt-2">
              {/* Section 1: Secret Santa Match */}
              {activeSection === 'match' && (
                <div>
                  {isDrawn && myAssignment ? (
                    <SecretSantaReveal
                      assignment={myAssignment}
                      recipient={recipientParticipant}
                      exchange={currentExchange}
                      currentUserId={user.uid}
                    />
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-zinc-800 rounded-3xl p-8 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
                      <span className="text-3xl block">⏳</span>
                      <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                        Names have not been drawn yet!
                      </p>
                      <p>Once the host draws names, your Secret Santa assignment will appear right here!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Section 2: My Wishlist */}
              {activeSection === 'wishlist' && (
                currentParticipant ? (
                  <WishlistEditor
                    exchangeId={currentExchange.id}
                    participant={currentParticipant}
                    isDrawn={isDrawn}
                    budget={currentExchange.budget}
                    currency={currentExchange.currency}
                    registrationDeadline={currentExchange.registrationDeadline}
                  />
                ) : (
                  <div className="bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-3">
                    <span className="text-3xl block">🎁</span>
                    <h3 className="text-base font-black text-red-700 dark:text-red-400">
                      Claim Your Name to Unlock Your Wishlist!
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                      Tap your name from the guest list roster above so your Secret Santa knows what gifts you want!
                    </p>
                  </div>
                )
              )}

              {/* Section 3: Participants / Roster */}
              {activeSection === 'participants' && (
                participants.length === 0 ? (
                  <ParticipantsSkeleton />
                ) : (
                  <ParticipantsList
                    exchange={currentExchange}
                    participants={participants}
                    currentUserId={user.uid}
                    isOrganizer={isOrganizer}
                    onViewWishlist={(p) => setInspectParticipant(p)}
                    onOpenShare={() => setShowShareModal(true)}
                    onLeaveExchange={handleLeaveExchange}
                    onClaimName={(p) => {
                      setActiveSection('wishlist');
                    }}
                  />
                )
              )}

              {/* Section 4: Event Details & Countdown */}
              {activeSection === 'details' && (
                <ExchangeHeader
                  exchange={currentExchange}
                  participants={participants}
                  isOrganizer={isOrganizer}
                  onOpenShare={() => setShowShareModal(true)}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {user && (
        <>
          <CreateExchangeModal
            user={user}
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreated={(newEx) => {
              setUserExchanges((prev) => [newEx, ...prev]);
              setCurrentExchange(newEx);
              setActiveSection('wishlist');
              saveExchangeToStorage(newEx.id);
              setShowShareModal(true);
            }}
          />

          <JoinExchangeModal
            user={user}
            isOpen={showJoinModal}
            onClose={() => setShowJoinModal(false)}
            onJoined={(joinedEx) => {
              if (!userExchanges.some((ex) => ex.id === joinedEx.id)) {
                setUserExchanges((prev) => [joinedEx, ...prev]);
              }
              setCurrentExchange(joinedEx);
              saveExchangeToStorage(joinedEx.id);
            }}
          />

          <ViewWishlistModal
            participant={inspectParticipant}
            budget={currentExchange?.budget || ''}
            onClose={() => setInspectParticipant(null)}
          />

          {currentExchange && (
            <QuickShareModal
              exchange={currentExchange}
              isOpen={showShareModal}
              onClose={() => setShowShareModal(false)}
            />
          )}

          <SettingsModal
            user={user}
            currentExchange={currentExchange}
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={(val) => setIsDarkMode(val)}
            onExchangeUpdated={(updated) => {
              setCurrentExchange(updated);
              setUserExchanges((prev) => prev.map((ex) => ex.id === updated.id ? updated : ex));
            }}
            onExchangeDeleted={(deletedId) => {
              const remaining = userExchanges.filter((ex) => ex.id !== deletedId);
              setUserExchanges(remaining);
              setCurrentExchange(remaining.length > 0 ? remaining[0] : null);
            }}
            onLeaveExchange={handleLeaveExchange}
          />
        </>
      )}
    </div>
  );
}
