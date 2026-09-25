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
  getDoc,
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
import { ExchangeHeader } from './components/ExchangeHeader';
import { WishlistEditor } from './components/WishlistEditor';
import { ParticipantsList } from './components/ParticipantsList';
import { SecretSantaReveal } from './components/SecretSantaReveal';
import { ViewWishlistModal } from './components/ViewWishlistModal';
import { SettingsModal } from './components/SettingsModal';
import { QuickShareModal } from './components/QuickShareModal';
import { AppSkeleton, WishlistSkeleton, ParticipantsSkeleton } from './components/SkeletonLoader';
import { Gift, Plus, Users, Calendar, DollarSign, MapPin, Sparkles, Share2, UserPlus } from 'lucide-react';
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
  const [myAssignment, setMyAssignment] = useState<Assignment | null>(null);
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
          // Immediately strip ?code= from browser URL so it doesn't persist across refreshes or actions
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
            const hasLeftExplicitly = localStorage.getItem(`left_exchange_${foundEx.id}_${user.uid}`) === 'true';

            // If opening directly with an invite code, join once if not yet a participant and user hasn't explicitly left
            if (!hasLeftExplicitly) {
              try {
                const partRef = doc(db, 'exchanges', foundEx.id, 'participants', user.uid);
                const pSnap = await getDoc(partRef);
                if (!pSnap.exists()) {
                  const newPart: Participant = {
                    id: user.uid,
                    userId: user.uid,
                    displayName: user.displayName || user.email?.split('@')[0] || 'Guest',
                    email: user.email || '',
                    photoURL: user.photoURL || undefined,
                    isOrganizer: foundEx.organizerId === user.uid,
                    isWishlistReady: false,
                    joinedAt: new Date().toISOString(),
                    preferences: { likes: '', dislikes: '', clothingSize: '', notes: '' },
                    wishlist: [],
                  };
                  await setDoc(partRef, newPart);
                }
              } catch (err) {
                console.error('Error auto-registering via invite code:', err);
              }
            }
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
      setMyAssignment(null);
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
        snapshot.forEach((d) => list.push(d.data() as Participant));
        setParticipants(list);
      }
    );

    let unsubAssignment = () => {};
    let unsubSantaNotes = () => {};
    if (user) {
      unsubAssignment = onSnapshot(
        doc(db, 'exchanges', currentExchange.id, 'assignments', user.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            setMyAssignment(docSnap.data() as Assignment);
            // Default to 'match' tab once drawn
            setActiveSection('match');
          } else {
            setMyAssignment(null);
          }
        },
        () => {
          setMyAssignment(null);
        }
      );

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
      unsubAssignment();
      unsubSantaNotes();
    };
  }, [currentExchange?.id, user?.uid]);

  const handleLeaveExchange = async (exchangeId: string) => {
    if (!user) return;
    try {
      // 1. Remember that user explicitly left this exchange
      localStorage.setItem(`left_exchange_${exchangeId}_${user.uid}`, 'true');

      // 2. Immediately strip ?code= from browser URL if present
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('code');
        window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.searchParams.toString() ? '?' + cleanUrl.searchParams.toString() : ''));
      } catch (e) {
        // ignore
      }

      // 3. Optimistically remove user from participants state right away
      setParticipants((prev) => prev.filter((p) => p.userId !== user.uid && p.id !== user.uid));

      // 4. Remove participant document from Firestore by user.uid
      try {
        await deleteDoc(doc(db, 'exchanges', exchangeId, 'participants', user.uid));
      } catch (e) {
        // ignore
      }

      // 5. Query and delete ANY participant document in this exchange matching userId or email
      try {
        const qUser = query(collection(db, 'exchanges', exchangeId, 'participants'), where('userId', '==', user.uid));
        const snapUser = await getDocs(qUser);
        for (const d of snapUser.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        // ignore
      }

      if (user.email) {
        try {
          const qEmail = query(collection(db, 'exchanges', exchangeId, 'participants'), where('email', '==', user.email));
          const snapEmail = await getDocs(qEmail);
          for (const d of snapEmail.docs) {
            await deleteDoc(d.ref);
          }
        } catch (e) {
          // ignore
        }
      }
      
      // 6. Remove assignment doc if it exists
      try {
        await deleteDoc(doc(db, 'exchanges', exchangeId, 'assignments', user.uid));
      } catch (e) {
        // ignore
      }

      // 7. Remove exchange ID from user's joined_exchanges in localStorage
      const storageKey = `joined_exchanges_${user.uid}`;
      const saved: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const filtered = saved.filter((id) => id !== exchangeId);
      localStorage.setItem(storageKey, JSON.stringify(filtered));

      // 8. Update user exchanges state
      const remaining = userExchanges.filter((ex) => ex.id !== exchangeId);
      setUserExchanges(remaining);

      // 9. Update current exchange selection
      if (currentExchange?.id === exchangeId) {
        if (remaining.length > 0) {
          setCurrentExchange(remaining[0]);
          setActiveSection(remaining[0].status === 'drawn' ? 'match' : 'wishlist');
        } else {
          setCurrentExchange(null);
        }
      }
    } catch (err) {
      console.error('Failed to leave exchange:', err);
    }
  };

  const handleJoinCurrentExchange = async () => {
    if (!user || !currentExchange) return;
    try {
      localStorage.removeItem(`left_exchange_${currentExchange.id}_${user.uid}`);
      const partRef = doc(db, 'exchanges', currentExchange.id, 'participants', user.uid);
      const newPart: Participant = {
        id: user.uid,
        userId: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Guest',
        email: user.email || '',
        photoURL: user.photoURL || undefined,
        isOrganizer: currentExchange.organizerId === user.uid,
        isWishlistReady: false,
        joinedAt: new Date().toISOString(),
        preferences: { likes: '', dislikes: '', clothingSize: '', notes: '' },
        wishlist: [],
      };
      await setDoc(partRef, newPart);
      saveExchangeToStorage(currentExchange.id);
      playClickSound();
    } catch (err) {
      console.error('Failed to join exchange:', err);
    }
  };

  const currentParticipant = participants.find((p) => p.userId === user?.uid);
  const isOrganizer = currentExchange?.organizerId === user?.uid;
  const isDrawn = currentExchange?.status === 'drawn';
  const currencySym = getCurrencySymbol(currentExchange?.currency);

  const recipientParticipant = myAssignment
    ? participants.find(
        (p) => (p.userId && p.userId === myAssignment.recipientId) || p.id === myAssignment.recipientId
      ) || null
    : null;

  if (authLoading || (user && exchangesLoading && !currentExchange)) {
    return <AppSkeleton />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {!user ? (
          <HeroLogin />
        ) : !currentExchange ? (
          /* Empty state: create or join */
          <div className="max-w-md mx-auto py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-800 text-white mx-auto flex items-center justify-center mb-4 shadow-sm">
              <Gift className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
              Welcome to Secret Santa!
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Create a new holiday exchange for your group (default budget in PHP ₱) or join using a room code.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Exchange</span>
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Join with Code</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Minimal Sub-header: Event title + Room code */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>{currentExchange.title}</span>
                </h1>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  <span>Budget: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{currentExchange.budget}</strong></span>
                  <span>•</span>
                  <span>Event: {currentExchange.exchangeDate}</span>
                  {currentExchange.registrationDeadline && (
                    <>
                      <span>•</span>
                      <span className="text-amber-700 dark:text-amber-400 font-medium">
                        Lock: {currentExchange.registrationDeadline}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>{currentExchange.location}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Room Code:</span>
                <span className="font-mono text-xs font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md">
                  {currentExchange.code}
                </span>
                <button
                  onClick={() => {
                    playClickSound();
                    setShowShareModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer ml-1"
                  title="Share Direct Party Link & QR Code"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share Party</span>
                  <span className="sm:hidden">Share</span>
                </button>
              </div>
            </div>

            {/* Flat Section Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 mb-6 overflow-x-auto">
              {isDrawn && myAssignment && (
                <button
                  onClick={() => {
                    playClickSound();
                    setActiveSection('match');
                  }}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                    activeSection === 'match'
                      ? 'border-red-700 text-red-700 dark:border-red-500 dark:text-red-400 font-bold'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
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
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeSection === 'wishlist'
                    ? 'border-red-700 text-red-700 dark:border-red-500 dark:text-red-400 font-bold'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                📝 My Wishlist
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  setActiveSection('participants');
                }}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeSection === 'participants'
                    ? 'border-red-700 text-red-700 dark:border-red-500 dark:text-red-400 font-bold'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                👥 Participants ({participants.length})
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  setActiveSection('details');
                }}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeSection === 'details'
                    ? 'border-red-700 text-red-700 dark:border-red-500 dark:text-red-400 font-bold'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                📅 Event Details & Countdown
              </button>
            </div>

            {/* Content for Active Section */}
            <div>
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
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                      Names have not been drawn yet. Once the organizer draws names, your recipient will appear here.
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
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-full bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        You are not participating in this exchange
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                        You have left or are previewing &quot;{currentExchange.title}&quot;. Join to add your wishlist items and take part in the Secret Santa gift exchange.
                      </p>
                    </div>
                    <button
                      onClick={handleJoinCurrentExchange}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Join This Party</span>
                    </button>
                  </div>
                )
              )}

              {/* Section 3: Participants */}
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
              setActiveSection(joinedEx.status === 'drawn' ? 'match' : 'wishlist');
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
