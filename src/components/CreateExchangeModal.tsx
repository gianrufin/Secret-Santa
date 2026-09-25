import React, { useState } from 'react';
import { X, Calendar, DollarSign, MapPin } from 'lucide-react';
import { User, db, doc, setDoc } from '../firebase';
import { Exchange, Participant, CURRENCY_SYMBOLS, getCurrencySymbol } from '../types';

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
  const [currency, setCurrency] = useState('PHP'); // Default to PHP as requested
  const [budget, setBudget] = useState('₱1,000');
  const [exchangeDate, setExchangeDate] = useState('2026-12-25');
  const [registrationDeadline, setRegistrationDeadline] = useState('2026-12-20');
  const [location, setLocation] = useState('In-Person Gathering');
  const [description, setDescription] = useState('Bring a wrapped gift with a recipient tag for our in-person exchange.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSym = getCurrencySymbol(currency);
  const budgetPresets = [
    `${currentSym}500 max`,
    `${currentSym}1,000 max`,
    `${currentSym}1,500 max`,
    `${currentSym}2,000 max`,
    `${currentSym}3,000 max`,
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an event name.');
      return;
    }
    if (!budget.trim()) {
      setError('Please specify a gift budget.');
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

      const organizerParticipant: Participant = {
        id: user.uid,
        userId: user.uid,
        displayName: user.displayName || 'Organizer',
        email: user.email || '',
        photoURL: user.photoURL || undefined,
        isOrganizer: true,
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

      await setDoc(doc(db, 'exchanges', exchangeId, 'participants', user.uid), organizerParticipant);

      onCreated(newExchange);
      onClose();
    } catch (err: any) {
      console.error('Error creating exchange:', err);
      setError(err.message || 'Failed to create exchange.');
    } finally {
      setSubmitting(false);
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

        <div className="mb-5">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Create Gift Exchange</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Configure your in-person Secret Santa party and budget limit
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-md bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Event Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Barkada Christmas 2026 Exchange"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          {/* Currency & Budget limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  const sym = getCurrencySymbol(e.target.value);
                  setBudget(`${sym}1,000`);
                }}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 cursor-pointer"
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
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Gift Budget <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <span className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 font-bold text-xs">
                  {currentSym}
                </span>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${currentSym}1,000 or ${currentSym}500 - ${currentSym}1,500`}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">
              Quick Budget Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {budgetPresets.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setBudget(preset)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    budget === preset
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-medium'
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-400" />
                <span>Exchange Event Date</span>
              </label>
              <input
                type="date"
                required
                value={exchangeDate}
                onChange={(e) => setExchangeDate(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-500" />
                <span>Wishlist Lock Deadline</span>
              </label>
              <input
                type="date"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                Participants must finalize & lock wishlists before this date.
              </span>
            </div>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-zinc-400" />
              <span>In-Person Location</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Kuya's House / Restaurant"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Instructions or Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any rules or theme details (e.g. handmade cards, gag gifts welcome)..."
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Exchange'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
