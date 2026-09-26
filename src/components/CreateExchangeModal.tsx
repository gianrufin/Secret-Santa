import React, { useState } from 'react';
import { X, Calendar, DollarSign, MapPin, Plus, Trash2, Users, Gift, Sparkles, UserCheck } from 'lucide-react';
import { User, db, doc, setDoc } from '../firebase';
import { Exchange, Participant, getCurrencySymbol } from '../types';
import { playClickSound, playChimeSound } from '../utils/audio';

interface CreateExchangeModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (exchange: Exchange) => void;
}

export const CreateExchangeModal: React.FC<CreateExchangeModalProps> = ({
  user,
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [currency, setCurrency] = useState('PHP');
  const [budget, setBudget] = useState('₱1,000');
  const [exchangeDate, setExchangeDate] = useState('2026-12-25');
  const [registrationDeadline, setRegistrationDeadline] = useState('2026-12-20');
  const [location, setLocation] = useState('Holiday Party Gathering');
  const [description, setDescription] = useState('Bring a wrapped gift for our festive in-person Secret Santa exchange! 🎁');
  
  // Roster of participant names
  const defaultOrganizerName = user.displayName || user.email?.split('@')[0] || 'Me (Organizer)';
  const [organizerParticipates, setOrganizerParticipates] = useState(true);
  const [participantNames, setParticipantNames] = useState<string[]>(['Gian', 'Sarah', 'Mom', 'Dad']);
  const [newNameInput, setNewNameInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSym = getCurrencySymbol(currency);
  const budgetPresets = [
    `${currentSym}500`,
    `${currentSym}1,000`,
    `${currentSym}1,500`,
    `${currentSym}2,000`,
    `${currentSym}3,000`,
  ];

  const handleAddName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newNameInput.trim();
    if (!trimmed) return;
    if (participantNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" is already on the guest list!`);
      return;
    }
    setError(null);
    setParticipantNames((prev) => [...prev, trimmed]);
    setNewNameInput('');
    playClickSound();
  };

  const handleRemoveName = (idx: number) => {
    playClickSound();
    setParticipantNames((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a festive event title!');
      return;
    }
    if (!budget.trim()) {
      setError('Please specify a gift budget limit.');
      return;
    }

    // Build final names list
    let finalNames = [...participantNames];
    if (organizerParticipates) {
      const orgName = user.displayName || user.email?.split('@')[0] || 'Organizer';
      if (!finalNames.some((n) => n.toLowerCase() === orgName.toLowerCase())) {
        finalNames.unshift(orgName);
      }
    }

    if (finalNames.length < 2) {
      setError('Please add at least 2 participants to the holiday roster so names can be drawn!');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const randomCode = 'XMAS' + Math.floor(1000 + Math.random() * 9000).toString();
      const exchangeId = 'ex_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

      const newExchange: Exchange = {
        id: exchangeId,
        code: randomCode,
        title: title.trim(),
        currency,
        budget: budget.trim(),
        exchangeDate,
        registrationDeadline: registrationDeadline || undefined,
        location: location.trim(),
        description: description.trim(),
        organizerId: user.uid,
        organizerName: user.displayName || user.email || 'Host',
        organizerEmail: user.email || '',
        status: 'registration',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'exchanges', exchangeId), newExchange);

      // Create each participant on the roster
      const now = new Date().toISOString();
      const orgName = user.displayName || user.email?.split('@')[0] || 'Organizer';

      for (let i = 0; i < finalNames.length; i++) {
        const name = finalNames[i];
        const isOrganizerClaim = organizerParticipates && (
          name.toLowerCase() === orgName.toLowerCase() || 
          (i === 0 && name.toLowerCase().includes('me') || name.toLowerCase().includes('organizer'))
        );

        const partId = isOrganizerClaim 
          ? user.uid 
          : 'part_' + Date.now().toString(36) + '_' + i + '_' + Math.random().toString(36).substring(2, 6);

        const newPart: Participant = {
          id: partId,
          displayName: name,
          isOrganizer: isOrganizerClaim,
          claimed: isOrganizerClaim,
          userId: isOrganizerClaim ? user.uid : undefined,
          email: isOrganizerClaim ? (user.email || undefined) : undefined,
          photoURL: isOrganizerClaim ? (user.photoURL || undefined) : undefined,
          claimedAt: isOrganizerClaim ? now : undefined,
          isWishlistReady: false,
          joinedAt: now,
          preferences: {
            likes: '',
            dislikes: '',
            clothingSize: '',
            notes: '',
          },
          wishlist: [],
        };

        await setDoc(doc(db, 'exchanges', exchangeId, 'participants', partId), newPart);
      }

      playChimeSound();
      onCreated(newExchange);
      onClose();
    } catch (err: any) {
      console.error('Error creating exchange:', err);
      setError(err.message || 'Failed to create exchange. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-red-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border-4 border-red-500/80 dark:border-red-600/70 rounded-3xl p-5 sm:p-7 shadow-2xl text-zinc-900 dark:text-zinc-100 my-8 max-h-[92vh] overflow-y-auto overflow-x-hidden">
        {/* Festive top close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-red-100 dark:bg-zinc-800 text-red-700 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-zinc-700 transition-transform active:scale-90 cursor-pointer shadow-xs"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Festive Header */}
        <div className="mb-6 flex items-start gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center text-2xl shadow-md shrink-0 animate-gentle-bounce">
            🎄
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-red-700 dark:text-red-400 tracking-tight">
                Create Holiday Gift Exchange
              </h2>
              <span className="text-lg">🎅</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Add your guest list roster upfront! Invited members will pick their name to claim their spot.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/70 border-2 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Party Title */}
          <div>
            <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
              <span>🎁 Party Event Name</span>
              <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Santos Family Christmas 2026 or Barkada Holiday Exchange"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-red-50/50 dark:bg-zinc-800 border-2 border-red-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-red-500 font-medium text-xs sm:text-sm"
            />
          </div>

          {/* Currency & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                🪙 Currency
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  const sym = getCurrencySymbol(e.target.value);
                  setBudget(`${sym}1,000`);
                }}
                className="w-full bg-red-50/50 dark:bg-zinc-800 border-2 border-red-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 font-medium cursor-pointer"
              >
                <option value="PHP">₱ PHP - Philippine Peso</option>
                <option value="USD">$ USD - US Dollar</option>
                <option value="EUR">€ EUR - Euro</option>
                <option value="GBP">£ GBP - British Pound</option>
                <option value="CAD">CA$ CAD - Canadian Dollar</option>
                <option value="AUD">AU$ AUD - Australian Dollar</option>
                <option value="JPY">¥ JPY - Japanese Yen</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
                <span>💰 Gift Budget Limit</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <span className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-2.5 font-bold text-sm">
                  {currentSym}
                </span>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${currentSym}1,000`}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-red-50/50 dark:bg-zinc-800 border-2 border-red-200 dark:border-zinc-700 rounded-2xl pl-8 pr-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-bold text-xs sm:text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Quick budget presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mr-1">
              Popular Presets:
            </span>
            {budgetPresets.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setBudget(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer font-bold ${
                  budget === preset
                    ? 'bg-red-700 text-white border-red-700 shadow-xs scale-105'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-red-100 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-zinc-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Upfront Guest List Roster Section */}
          <div className="bg-gradient-to-br from-emerald-50/90 to-amber-50/60 dark:from-emerald-950/30 dark:to-zinc-800/60 border-2 border-emerald-300 dark:border-emerald-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-emerald-900 dark:text-emerald-300 text-sm flex items-center gap-2">
                  <span>📜 Guest List Roster (Who is invited?)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 font-bold">
                    {participantNames.length + (organizerParticipates ? 1 : 0)} people
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400 mt-0.5 leading-relaxed">
                  Only these listed people will be able to claim a spot. You can also add more people anytime later! 🎄
                </p>
              </div>

              {/* Organizer participate checkbox */}
              <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 cursor-pointer bg-white/80 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 shrink-0">
                <input
                  type="checkbox"
                  checked={organizerParticipates}
                  onChange={(e) => setOrganizerParticipates(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>Include me ({defaultOrganizerName})</span>
              </label>
            </div>

            {/* Input to add names */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a participant's name (e.g. Maria, Uncle Bob, Alex)..."
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddName();
                  }
                }}
                className="flex-1 bg-white dark:bg-zinc-900 border-2 border-emerald-200 dark:border-emerald-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 font-medium"
              />
              <button
                type="button"
                onClick={() => handleAddName()}
                className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Name</span>
              </button>
            </div>

            {/* Tags/Badges list of added names */}
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
              {organizerParticipates && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-2 border-amber-300 dark:border-amber-700 font-bold text-xs shadow-xs">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span className="truncate max-w-[140px]">{defaultOrganizerName}</span>
                  <span className="text-[10px] bg-amber-200 dark:bg-amber-900 px-1.5 py-0.2 rounded-md">Host</span>
                </div>
              )}

              {participantNames.map((name, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-2 border-emerald-200 dark:border-zinc-700 font-semibold text-xs shadow-xs group"
                >
                  <span className="text-emerald-600 dark:text-emerald-400">⛄</span>
                  <span className="truncate max-w-[150px]">{name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveName(idx)}
                    className="w-4 h-4 rounded-full text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                    title="Remove name"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {participantNames.length === 0 && !organizerParticipates && (
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium py-1">
                  Please add at least 2 participant names above!
                </p>
              )}
            </div>
          </div>

          {/* Dates & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                <span>Exchange Event Date</span>
              </label>
              <input
                type="date"
                required
                value={exchangeDate}
                onChange={(e) => setExchangeDate(e.target.value)}
                className="w-full bg-red-50/50 dark:bg-zinc-800 border-2 border-red-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Wishlist Lock Deadline</span>
              </label>
              <input
                type="date"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full bg-red-50/50 dark:bg-zinc-800 border-2 border-red-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>Location / Venue</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Lola's Living Room or Bonifacio High Street Cafe"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-red-50/50 dark:bg-zinc-800 border-2 border-red-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-medium focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              📝 Fun Rules / Theme Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Wrapped with a big bow, gag gifts welcome, handmade cards encouraged!"
              className="w-full bg-red-50/50 dark:bg-zinc-800 border-2 border-red-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-medium focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white font-black shadow-lg transition-transform active:scale-95 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{submitting ? 'Creating Party...' : 'Create Holiday Exchange 🎁'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
