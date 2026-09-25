import React, { useState } from 'react';
import { 
  X, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX, 
  User as UserIcon, 
  Trash2, 
  ShieldAlert, 
  DollarSign, 
  Calendar, 
  MapPin, 
  RefreshCw, 
  LogOut,
  Save,
  AlertTriangle
} from 'lucide-react';
import { User, db, doc, updateDoc, deleteDoc, auth, signOut } from '../firebase';
import { Exchange, CURRENCY_SYMBOLS } from '../types';
import { setSoundEnabled, getSoundEnabled, playClickSound } from '../utils/audio';

interface SettingsModalProps {
  user: User;
  currentExchange: Exchange | null;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (val: boolean) => void;
  onExchangeUpdated: (updated: Exchange) => void;
  onExchangeDeleted: (exchangeId: string) => void;
  onLeaveExchange?: (exchangeId: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  currentExchange,
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  onExchangeUpdated,
  onExchangeDeleted,
  onLeaveExchange,
}) => {
  const [soundOn, setSoundOn] = useState(getSoundEnabled());
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Organizer Exchange Editing
  const isOrganizer = currentExchange?.organizerId === user.uid;
  const [budget, setBudget] = useState(currentExchange?.budget || '₱1,000');
  const [currency, setCurrency] = useState(currentExchange?.currency || 'PHP');
  const [exchangeDate, setExchangeDate] = useState(currentExchange?.exchangeDate || '2026-12-25');
  const [registrationDeadline, setRegistrationDeadline] = useState(currentExchange?.registrationDeadline || '');
  const [location, setLocation] = useState(currentExchange?.location || 'In-Person Gathering');
  const [savingExchange, setSavingExchange] = useState(false);
  const [confirmDeleteExchange, setConfirmDeleteExchange] = useState(false);
  const [confirmLeaveExchange, setConfirmLeaveExchange] = useState(false);
  const [leavingExchange, setLeavingExchange] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [confirmResetDraw, setConfirmResetDraw] = useState(false);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playClickSound();
  };

  const handleSaveProfile = async () => {
    if (!currentExchange) return;
    try {
      setSavingProfile(true);
      const participantRef = doc(db, 'exchanges', currentExchange.id, 'participants', user.uid);
      await updateDoc(participantRef, {
        displayName: displayName.trim(),
      });
      playClickSound();
      alert('Profile display name updated for this exchange.');
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveExchange = async () => {
    if (!currentExchange) return;
    try {
      setSavingExchange(true);
      const exRef = doc(db, 'exchanges', currentExchange.id);
      const updated = {
        ...currentExchange,
        budget: budget.trim(),
        currency,
        exchangeDate,
        registrationDeadline: registrationDeadline || undefined,
        location: location.trim(),
      };
      await updateDoc(exRef, updated);
      onExchangeUpdated(updated);
      playClickSound();
      alert('Exchange settings saved.');
    } catch (e) {
      console.error(e);
    } finally {
      setSavingExchange(false);
    }
  };

  const handleResetDraw = async () => {
    if (!currentExchange) return;
    try {
      const exRef = doc(db, 'exchanges', currentExchange.id);
      await updateDoc(exRef, {
        status: 'registration',
      });
      setConfirmResetDraw(false);
      playClickSound();
      alert('Draw has been reset. Participants can now join or update wishlists before redrawing.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteExchange = async () => {
    if (!currentExchange) return;
    try {
      await deleteDoc(doc(db, 'exchanges', currentExchange.id));
      onExchangeDeleted(currentExchange.id);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveCurrentExchange = async () => {
    if (!currentExchange) return;
    try {
      setLeavingExchange(true);
      if (onLeaveExchange) {
        await onLeaveExchange(currentExchange.id);
      } else {
        await deleteDoc(doc(db, 'exchanges', currentExchange.id, 'participants', user.uid));
        try {
          await deleteDoc(doc(db, 'exchanges', currentExchange.id, 'assignments', user.uid));
        } catch (e) {
          // ignore
        }
        const storageKey = `joined_exchanges_${user.uid}`;
        const saved: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const filtered = saved.filter((id) => id !== currentExchange.id);
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      }
      playClickSound();
      onClose();
    } catch (e: any) {
      console.error('Failed to leave exchange:', e);
    } finally {
      setLeavingExchange(false);
      setConfirmLeaveExchange(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (currentExchange) {
        await deleteDoc(doc(db, 'exchanges', currentExchange.id, 'participants', user.uid));
        try {
          await deleteDoc(doc(db, 'exchanges', currentExchange.id, 'assignments', user.uid));
        } catch (e) {
          // ignore
        }
        const storageKey = `joined_exchanges_${user.uid}`;
        const saved: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const filtered = saved.filter((id) => id !== currentExchange.id);
        localStorage.setItem(storageKey, JSON.stringify(filtered));

        if (onLeaveExchange) {
          onLeaveExchange(currentExchange.id);
        }
      }
      localStorage.clear();
      await signOut(auth);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-5">
          Settings & Preferences
        </h2>

        <div className="space-y-6 text-xs">
          {/* Section 1: Appearance & Sound */}
          <div className="space-y-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[11px]">
              Theme & Audio
            </h3>

            {/* Dark mode */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2.5">
                {isDarkMode ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-600" />}
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">Appearance</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Switch between Light and Dark mode
                  </p>
                </div>
              </div>
              <button
                onClick={() => onToggleDarkMode(!isDarkMode)}
                className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </button>
            </div>

            {/* Sound toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2.5">
                {soundOn ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">Holiday Audio Effects</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Chimes on reveals and wishlist updates
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleSound}
                className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {soundOn ? 'Enabled' : 'Muted'}
              </button>
            </div>
          </div>

          {/* Section 2: Profile settings */}
          <div className="space-y-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[11px]">
              Profile in this Exchange
            </h3>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                Display Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Organizer Controls (If host) */}
          {isOrganizer && currentExchange && (
            <div className="space-y-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider text-[11px]">
                Organizer Controls
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 cursor-pointer"
                  >
                    <option value="PHP">PHP (₱) - Philippine Peso</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="CAD">CAD (CA$) - Canadian Dollar</option>
                    <option value="AUD">AUD (AU$) - Australian Dollar</option>
                    <option value="JPY">JPY (¥) - Japanese Yen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                    Budget Guideline
                  </label>
                  <input
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                    Exchange Event Date
                  </label>
                  <input
                    type="date"
                    value={exchangeDate}
                    onChange={(e) => setExchangeDate(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                    Wishlist Lock Deadline
                  </label>
                  <input
                    type="date"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                  In-Person Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={handleSaveExchange}
                  disabled={savingExchange}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 cursor-pointer"
                >
                  Save Exchange Details
                </button>

                {currentExchange.status === 'drawn' && (
                  <button
                    onClick={() => setConfirmResetDraw(true)}
                    className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset / Re-draw</span>
                  </button>
                )}
              </div>

              {confirmResetDraw && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Reset this draw?
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    This will clear the current assignments and allow new people to join before drawing again.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetDraw}
                      className="px-2.5 py-1 rounded bg-amber-700 text-white font-medium hover:bg-amber-800 cursor-pointer"
                    >
                      Yes, reset draw
                    </button>
                    <button
                      onClick={() => setConfirmResetDraw(false)}
                      className="px-2.5 py-1 rounded border border-amber-300 text-amber-800 dark:text-amber-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 4: Danger Zone */}
          <div className="space-y-3 pt-2">
            <h3 className="font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider text-[11px] flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Danger Zone</span>
            </h3>

            {isOrganizer && currentExchange && (
              <div>
                {!confirmDeleteExchange ? (
                  <button
                    onClick={() => setConfirmDeleteExchange(true)}
                    className="w-full text-left p-2.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Delete this Exchange</span>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 space-y-2">
                    <p className="font-semibold text-red-900 dark:text-red-200">
                      Permanently delete &quot;{currentExchange.title}&quot;?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteExchange}
                        className="px-2.5 py-1 rounded bg-red-700 text-white font-medium hover:bg-red-800 cursor-pointer"
                      >
                        Yes, Delete Exchange
                      </button>
                      <button
                        onClick={() => setConfirmDeleteExchange(false)}
                        className="px-2.5 py-1 rounded border border-red-300 text-red-700 dark:text-red-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Leave Current Exchange (Roster & Wishlist removal) */}
            {currentExchange && (
              <div>
                {!confirmLeaveExchange ? (
                  <button
                    onClick={() => setConfirmLeaveExchange(true)}
                    className="w-full text-left p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-800 dark:text-amber-300 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Leave &quot;{currentExchange.title}&quot;</span>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 space-y-2">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Leave &quot;{currentExchange.title}&quot;?
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      This will remove you from this exchange roster, clear your wishlist for this party, and you will not receive or give gifts in this exchange.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleLeaveCurrentExchange}
                        disabled={leavingExchange}
                        className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-medium cursor-pointer disabled:opacity-50"
                      >
                        {leavingExchange ? 'Leaving...' : 'Yes, Leave Exchange'}
                      </button>
                      <button
                        onClick={() => setConfirmLeaveExchange(false)}
                        className="px-2.5 py-1 rounded border border-amber-300 text-amber-700 dark:text-amber-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              {!confirmDeleteAccount ? (
                <button
                  onClick={() => setConfirmDeleteAccount(true)}
                  className="w-full text-left p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Leave Party & Sign Out</span>
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 space-y-2">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Leave and sign out?
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    This will remove you from this exchange roster, clear your wishlist data, and sign you out of your account.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      className="px-2.5 py-1 rounded bg-red-700 text-white font-medium hover:bg-red-800 cursor-pointer"
                    >
                      Confirm Leave & Sign Out
                    </button>
                    <button
                      onClick={() => setConfirmDeleteAccount(false)}
                      className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
