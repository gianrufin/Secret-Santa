import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Check, 
  Clock, 
  Save, 
  DollarSign,
  Lock,
  Unlock,
  AlertCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
import { db, doc, updateDoc } from '../firebase';
import { Participant, WishlistItem, ParticipantPreferences, getCurrencySymbol } from '../types';
import { playChimeSound, playClickSound } from '../utils/audio';

interface WishlistEditorProps {
  exchangeId: string;
  participant: Participant;
  isDrawn: boolean;
  budget: string;
  currency?: string;
  registrationDeadline?: string;
}

export const WishlistEditor: React.FC<WishlistEditorProps> = ({
  exchangeId,
  participant,
  isDrawn,
  budget,
  currency = 'PHP',
  registrationDeadline,
}) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(participant.wishlist || []);
  const [preferences, setPreferences] = useState<ParticipantPreferences>({
    likes: participant.preferences?.likes || '',
    dislikes: participant.preferences?.dislikes || '',
    clothingSize: participant.preferences?.clothingSize || '',
    notes: participant.preferences?.notes || '',
  });
  const [isReady, setIsReady] = useState<boolean>(participant.isWishlistReady || false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currencySym = getCurrencySymbol(currency);

  // New item inputs
  const [itemTitle, setItemTitle] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [itemNotes, setItemNotes] = useState('');

  // Check if deadline has passed
  const isDeadlinePassed = registrationDeadline
    ? new Date(registrationDeadline + 'T23:59:59').getTime() < Date.now()
    : false;

  // Final lock condition: drawn, deadline passed, or participant explicitly locked
  const isLocked = isDrawn || isDeadlinePassed || isReady;

  // Calculate days/hours left
  const getDeadlineStatus = () => {
    if (!registrationDeadline) return null;
    const deadlineTime = new Date(registrationDeadline + 'T23:59:59').getTime();
    const diff = deadlineTime - Date.now();
    if (diff <= 0) return { label: 'Deadline Passed', isOver: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 1) return { label: `${days} days left to lock wishlist`, isOver: false };
    if (days === 1) return { label: '1 day left to lock wishlist', isOver: false };
    return { label: `${hours} hours left to lock wishlist`, isOver: false };
  };

  const deadlineStatus = getDeadlineStatus();

  useEffect(() => {
    if (participant) {
      setWishlist(participant.wishlist || []);
      setPreferences({
        likes: participant.preferences?.likes || '',
        dislikes: participant.preferences?.dislikes || '',
        clothingSize: participant.preferences?.clothingSize || '',
        notes: participant.preferences?.notes || '',
      });
      setIsReady(participant.isWishlistReady || false);
    }
  }, [participant.id]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (!itemTitle.trim()) return;

    let formattedPrice = itemPrice.trim();
    if (formattedPrice && !formattedPrice.includes(currencySym) && !formattedPrice.includes('$')) {
      formattedPrice = `${currencySym}${formattedPrice}`;
    }

    const newItem: WishlistItem = {
      id: 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      title: itemTitle.trim(),
      price: formattedPrice || undefined,
      url: itemUrl.trim() || undefined,
      notes: itemNotes.trim() || undefined,
    };

    const updatedList = [...wishlist, newItem];
    setWishlist(updatedList);
    setItemTitle('');
    setItemPrice('');
    setItemUrl('');
    setItemNotes('');

    playClickSound();
    saveToFirebase(updatedList, preferences, isReady);
  };

  const handleRemoveItem = (id: string) => {
    if (isLocked) return;
    const updatedList = wishlist.filter((item) => item.id !== id);
    setWishlist(updatedList);
    playClickSound();
    saveToFirebase(updatedList, preferences, isReady);
  };

  const handleToggleReady = async () => {
    if (isDrawn || isDeadlinePassed) return;
    const nextReadyState = !isReady;
    setIsReady(nextReadyState);
    if (nextReadyState) {
      playChimeSound();
    } else {
      playClickSound();
    }
    await saveToFirebase(wishlist, preferences, nextReadyState);
  };

  const saveToFirebase = async (
    currentList: WishlistItem[],
    currentPrefs: ParticipantPreferences,
    currentReady: boolean
  ) => {
    try {
      setSaving(true);
      const participantRef = doc(db, 'exchanges', exchangeId, 'participants', participant.userId);
      await updateDoc(participantRef, {
        wishlist: currentList,
        preferences: currentPrefs,
        isWishlistReady: currentReady,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save wishlist:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = () => {
    if (isLocked && (isDrawn || isDeadlinePassed)) return;
    playClickSound();
    saveToFirebase(wishlist, preferences, isReady);
  };

  return (
    <div className="space-y-6">
      {/* 1. Dedicated Registration & Wishlist Lock Deadline Banner */}
      {registrationDeadline && (
        <div 
          className={`p-4 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDeadlinePassed || isDrawn
              ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700'
              : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60'
          }`}
        >
          <div className="flex items-start gap-3">
            <div 
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isDeadlinePassed || isDrawn
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
              }`}
            >
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Wishlist Lock Deadline: {registrationDeadline}
                </span>
                {deadlineStatus && (
                  <span 
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      deadlineStatus.isOver
                        ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                        : 'bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    {deadlineStatus.label}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                {isDrawn
                  ? 'Secret Santas have been drawn! Your wishlist is locked so your Santa has your finalized preferences.'
                  : isDeadlinePassed
                  ? 'The lock deadline has arrived. Registration & wishlists are now closed for matching.'
                  : 'Please submit your gift suggestions and lock your wishlist before this date so your Secret Santa can shop for you.'}
              </p>
            </div>
          </div>

          {!isDrawn && !isDeadlinePassed && (
            <button
              onClick={handleToggleReady}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                isReady
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-red-700 hover:bg-red-800 text-white shadow-xs'
              }`}
            >
              {isReady ? '✓ Wishlist Locked & Ready' : '🔒 Lock Wishlist Now'}
            </button>
          )}
        </div>
      )}

      {/* 2. Status Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Your Wishlist & Preferences</h2>
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                <Lock className="w-3 h-3 text-zinc-500" />
                <span>Locked</span>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Suggested budget is <span className="font-semibold text-emerald-700 dark:text-emerald-400">{budget}</span>.
            {isLocked 
              ? ' Your list is locked for your Secret Santa.' 
              : ' Add items and lock your list before the deadline.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isReady ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Wishlist Ready & Locked</span>
              </span>

              {!isDrawn && !isDeadlinePassed && (
                <button
                  onClick={handleToggleReady}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                  title="Unlock to edit items before deadline"
                >
                  Unlock to edit
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleToggleReady}
              disabled={isDrawn || isDeadlinePassed}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-700 hover:bg-red-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock & Mark as Ready</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Grid: Wishlist items & preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Wishlist Items (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Add Item Box */}
          {!isLocked ? (
            <form onSubmit={handleAddItem} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Add Gift Idea
              </h3>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Item name (e.g. Scented Candle, Cozy Scarf, Power Bank)..."
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <span className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 font-bold text-xs">
                    {currencySym}
                  </span>
                  <input
                    type="text"
                    placeholder={`Est. price (e.g. ${currencySym}500)`}
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                  />
                </div>

                <div>
                  <input
                    type="url"
                    placeholder="Product URL (optional link)"
                    value={itemUrl}
                    onChange={(e) => setItemUrl(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Size, color, or notes (e.g. Black color, Large size)"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Lock className="w-4 h-4 text-zinc-500" />
                <span>Wishlist is locked.</span>
              </div>
              {!isDrawn && !isDeadlinePassed && (
                <button
                  onClick={handleToggleReady}
                  className="text-xs font-semibold text-red-700 dark:text-red-400 hover:underline cursor-pointer"
                >
                  Unlock to add more items
                </button>
              )}
            </div>
          )}

          {/* Items list */}
          <div className="space-y-2">
            {wishlist.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                No items on your wishlist yet. Add 2 or 3 gift suggestions above!
              </div>
            ) : (
              wishlist.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[11px] font-bold">{idx + 1}.</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.title}</span>
                      {item.price && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                          {item.price}
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-zinc-600 dark:text-zinc-400 text-[11px] mt-1 ml-4">
                        {item.notes}
                      </p>
                    )}

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-red-700 dark:text-red-400 hover:underline mt-1.5 ml-4 font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View Item Link</span>
                      </a>
                    )}
                  </div>

                  {!isLocked && (
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Preferences Helper (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Helper Profile
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Clues to help your Secret Santa pick something you'll love.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Likes & Hobbies
              </label>
              <input
                type="text"
                disabled={isLocked && (isDrawn || isDeadlinePassed)}
                placeholder="e.g. Coffee, books, skincare, gaming..."
                value={preferences.likes}
                onChange={(e) => setPreferences({ ...preferences, likes: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 disabled:opacity-70"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Dislikes / Avoid
              </label>
              <input
                type="text"
                disabled={isLocked && (isDrawn || isDeadlinePassed)}
                placeholder="e.g. Scented lotions, chocolates, clutter..."
                value={preferences.dislikes}
                onChange={(e) => setPreferences({ ...preferences, dislikes: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 disabled:opacity-70"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Clothing or Shoe Size (if applicable)
              </label>
              <input
                type="text"
                disabled={isLocked && (isDrawn || isDeadlinePassed)}
                placeholder="e.g. Medium shirt, US 9 shoes"
                value={preferences.clothingSize}
                onChange={(e) => setPreferences({ ...preferences, clothingSize: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 disabled:opacity-70"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Allergies or Dietary Restrictions
              </label>
              <textarea
                rows={2}
                disabled={isLocked && (isDrawn || isDeadlinePassed)}
                placeholder="e.g. Peanut allergy, dairy free, no wool..."
                value={preferences.notes}
                onChange={(e) => setPreferences({ ...preferences, notes: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 resize-none disabled:opacity-70"
              />
            </div>

            {!isLocked || (!isDrawn && !isDeadlinePassed) ? (
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Helper Profile</span>
                </button>

                {savedSuccess && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Saved!
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
