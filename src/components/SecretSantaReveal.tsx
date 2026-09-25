import React, { useState } from 'react';
import { 
  Gift, 
  ExternalLink, 
  Check, 
  Eye, 
  EyeOff, 
  MapPin,
  Calendar,
  Printer,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { Assignment, Participant, Exchange, getCurrencySymbol } from '../types';
import { ScratchCardReveal } from './ScratchCardReveal';
import { AnonymousSantaChat } from './AnonymousSantaChat';
import { PrintableShoppingCard } from './PrintableShoppingCard';
import { playClickSound, playChimeSound } from '../utils/audio';

interface SecretSantaRevealProps {
  assignment: Assignment;
  recipient: Participant | null;
  exchange: Exchange;
  currentUserId: string;
}

export const SecretSantaReveal: React.FC<SecretSantaRevealProps> = ({
  assignment,
  recipient,
  exchange,
  currentUserId,
}) => {
  const storageKey = `unwrapped_${exchange.id}_${assignment.santaId}`;
  const [isUnwrapped, setIsUnwrapped] = useState(() => {
    return localStorage.getItem(storageKey) === 'true';
  });

  const [purchasedItems, setPurchasedItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`purchased_${exchange.id}_${assignment.santaId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [hideName, setHideName] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const currencySym = getCurrencySymbol(exchange.currency);
  const recipientName = assignment.recipientName || recipient?.displayName || 'Your Recipient';
  const recipientWishlist = recipient?.wishlist || [];
  const preferences = recipient?.preferences;

  const handleRevealDone = () => {
    setIsUnwrapped(true);
    localStorage.setItem(storageKey, 'true');
  };

  const togglePurchased = (itemId: string) => {
    playClickSound();
    const updated = purchasedItems.includes(itemId)
      ? purchasedItems.filter((id) => id !== itemId)
      : [...purchasedItems, itemId];
    setPurchasedItems(updated);
    localStorage.setItem(`purchased_${exchange.id}_${assignment.santaId}`, JSON.stringify(updated));
  };

  // If not unwrapped yet, show Scratch Card reveal
  if (!isUnwrapped) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center shadow-sm">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Your Secret Santa Match is Ready!
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Scratch below with your mouse or finger to uncover your assigned recipient.
            </p>
          </div>

          <ScratchCardReveal
            recipientName={recipientName}
            onRevealed={handleRevealDone}
          />
        </div>
      </div>
    );
  }

  // Purchased progress
  const purchasedPercent = recipientWishlist.length > 0
    ? Math.round((purchasedItems.length / recipientWishlist.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-red-700 dark:text-red-400 uppercase">
              Secret Santa Assignment
            </span>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mt-0.5">
              You are the Secret Santa for:
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Shopping Card</span>
            </button>

            <button
              onClick={() => {
                setHideName(!hideName);
                playClickSound();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium cursor-pointer"
            >
              {hideName ? <Eye className="w-3.5 h-3.5 text-amber-500" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{hideName ? 'Show Name' : 'Hide Name'}</span>
            </button>
          </div>
        </div>

        {/* Recipient summary banner */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-red-50/70 dark:bg-zinc-800/60 border border-red-100 dark:border-zinc-700">
          <div className="flex items-center gap-3.5">
            {recipient?.photoURL ? (
              <img
                src={recipient.photoURL}
                alt={recipientName}
                className={`w-14 h-14 rounded-full object-cover border-2 border-red-300 dark:border-red-800 ${
                  hideName ? 'blur-md' : ''
                }`}
              />
            ) : (
              <div
                className={`w-14 h-14 rounded-full bg-red-800 text-white font-bold flex items-center justify-center text-xl shadow-xs ${
                  hideName ? 'blur-md' : ''
                }`}
              >
                {recipientName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className={`text-2xl font-black text-zinc-900 dark:text-white ${hideName ? 'blur-sm select-none' : ''}`}>
                {hideName ? '••••••••••••' : recipientName}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Target budget: <span className="font-bold text-emerald-700 dark:text-emerald-400">{exchange.budget}</span>
              </p>
            </div>
          </div>

          <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 sm:text-right">
            <div className="flex items-center sm:justify-end gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>{exchange.exchangeDate}</span>
            </div>
            <div className="flex items-center sm:justify-end gap-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>{exchange.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recipient Details: Wishlist & Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wishlist & Shopping Checklist */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-red-700 dark:text-red-400" />
                <span>{recipientName}&apos;s Wishlist</span>
              </h3>
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {purchasedItems.length} of {recipientWishlist.length} bought ({purchasedPercent}%)
            </span>
          </div>

          {/* Progress bar */}
          {recipientWishlist.length > 0 && (
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${purchasedPercent}%` }}
              />
            </div>
          )}

          {recipientWishlist.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {recipientName} hasn&apos;t added specific items yet. Check their preferences on the right or send an anonymous note below!
            </div>
          ) : (
            <div className="space-y-2.5">
              {recipientWishlist.map((item) => {
                const isBought = purchasedItems.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 transition-colors ${
                      isBought
                        ? 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-400'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isBought ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-white'}`}>
                          {item.title}
                        </span>
                        {item.price && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                            {item.price}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                          {item.notes}
                        </p>
                      )}

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-1.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View item link</span>
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => togglePurchased(item.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                        isBought
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {isBought ? '✓ Bought' : 'Mark Bought'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preferences & Sizes */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Preferences & Sizes
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-0.5">Likes & Hobbies</span>
              <p className="text-zinc-600 dark:text-zinc-400">
                {preferences?.likes || 'No specific preferences listed.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-0.5">Dislikes & Allergies (Please Avoid)</span>
              <p className="text-zinc-600 dark:text-zinc-400">
                {preferences?.dislikes || 'None specified.'}
              </p>
            </div>

            {preferences?.clothingSize && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-0.5">Clothing / Shoe Sizes</span>
                <p className="text-zinc-600 dark:text-zinc-400">{preferences.clothingSize}</p>
              </div>
            )}

            {preferences?.notes && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-0.5">Note for Santa</span>
                <p className="text-zinc-600 dark:text-zinc-400">{preferences.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anonymous Santa Note / Q&A Box */}
      {recipient && (
        <AnonymousSantaChat
          exchangeId={exchange.id}
          santaId={assignment.santaId}
          recipientId={assignment.recipientId}
          currentUserId={currentUserId}
          recipientName={recipientName}
        />
      )}

      {/* Printable Shopping Card Modal */}
      {showPrintModal && (
        <PrintableShoppingCard
          recipient={recipient}
          exchange={exchange}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
