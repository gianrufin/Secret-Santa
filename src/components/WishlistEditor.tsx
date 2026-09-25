import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Check, 
  Clock, 
  Save, 
  DollarSign
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
}

export const WishlistEditor: React.FC<WishlistEditorProps> = ({
  exchangeId,
  participant,
  isDrawn,
  budget,
  currency = 'PHP',
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
    const updatedList = wishlist.filter((item) => item.id !== id);
    setWishlist(updatedList);
    playClickSound();
    saveToFirebase(updatedList, preferences, isReady);
  };

  const handleToggleReady = async () => {
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
    playClickSound();
    saveToFirebase(wishlist, preferences, isReady);
  };

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Your Wishlist & Preferences</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Suggested budget is <span className="font-semibold text-emerald-700 dark:text-emerald-400">{budget}</span>.
            Click below when you are ready for the draw.
          </p>
        </div>

        <button
          onClick={handleToggleReady}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
            isReady
              ? 'bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-600'
              : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700'
          }`}
        >
          {isReady ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Wishlist Ready for Draw!</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>Mark Wishlist as Ready</span>
            </>
          )}
        </button>
      </div>

      {/* Grid: 2 columns for items and preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Wishlist Items (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Add Item Box */}
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
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
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
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <input
                  type="url"
                  placeholder="Product URL (optional link)"
                  value={itemUrl}
                  onChange={(e) => setItemUrl(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="Size, color, or notes (e.g. Black color, Large size)"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
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
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-1 ml-4"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View web link</span>
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Preferences (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                Preferences & Sizes
              </h3>
              {savedSuccess && (
                <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">Saved!</span>
              )}
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                Likes & Hobbies
              </label>
              <textarea
                rows={2}
                value={preferences.likes}
                onChange={(e) => setPreferences({ ...preferences, likes: e.target.value })}
                onBlur={handleSavePreferences}
                placeholder="e.g. Dark chocolate, anime, stationery, coffee, board games..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                Dislikes & Allergies
              </label>
              <textarea
                rows={2}
                value={preferences.dislikes}
                onChange={(e) => setPreferences({ ...preferences, dislikes: e.target.value })}
                onBlur={handleSavePreferences}
                placeholder="e.g. Seafood allergy, no scented lotions..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                Clothing or Shoe Sizes
              </label>
              <input
                type="text"
                value={preferences.clothingSize}
                onChange={(e) => setPreferences({ ...preferences, clothingSize: e.target.value })}
                onBlur={handleSavePreferences}
                placeholder="e.g. Shirt: Medium, Shoe: 9.5"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                Note for Santa
              </label>
              <textarea
                rows={2}
                value={preferences.notes}
                onChange={(e) => setPreferences({ ...preferences, notes: e.target.value })}
                onBlur={handleSavePreferences}
                placeholder="e.g. Maligayang Pasko! Looking forward to celebrating with everyone."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
