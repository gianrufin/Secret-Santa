import React, { useState } from 'react';
import { X, Printer, Copy, Check, Gift, Heart, Tag } from 'lucide-react';
import { Participant, Exchange, getCurrencySymbol } from '../types';

interface PrintableShoppingCardProps {
  recipient: Participant | null;
  exchange: Exchange;
  onClose: () => void;
}

export const PrintableShoppingCard: React.FC<PrintableShoppingCardProps> = ({
  recipient,
  exchange,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  if (!recipient) return null;

  const currencySymbol = getCurrencySymbol(exchange.currency);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    let text = `🎄 Secret Santa Shopping Card for ${recipient.displayName}\n`;
    text += `💰 Budget: ${exchange.budget}\n`;
    text += `📅 Exchange: ${exchange.exchangeDate} at ${exchange.location}\n\n`;

    if (recipient.preferences?.clothingSize) {
      text += `Sizes: ${recipient.preferences.clothingSize}\n`;
    }
    if (recipient.preferences?.likes) {
      text += `Likes: ${recipient.preferences.likes}\n`;
    }
    if (recipient.preferences?.dislikes) {
      text += `Avoid: ${recipient.preferences.dislikes}\n\n`;
    }

    text += `🎁 Wishlist:\n`;
    (recipient.wishlist || []).forEach((item, i) => {
      text += `${i + 1}. ${item.title} ${item.price ? `(${item.price})` : ''}\n`;
      if (item.notes) text += `   Notes: ${item.notes}\n`;
      if (item.url) text += `   Link: ${item.url}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 max-h-[90vh] overflow-y-auto print:border-none print:shadow-none">
        {/* Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 print:hidden">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-red-700" />
            <h3 className="font-bold text-sm">Shopping Pocket Card</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 text-xs font-medium cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Card Content */}
        <div className="py-4 space-y-4">
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
              Shopping For:
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {recipient.displayName}
            </h2>
            <div className="flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-300 mt-2">
              <span className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 font-semibold border border-zinc-200 dark:border-zinc-700">
                Budget: {exchange.budget}
              </span>
              <span className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                {exchange.exchangeDate}
              </span>
              <span className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                {exchange.location}
              </span>
            </div>
          </div>

          {/* Sizes and preferences */}
          {(recipient.preferences?.clothingSize || recipient.preferences?.likes || recipient.preferences?.dislikes) && (
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs space-y-2">
              {recipient.preferences.clothingSize && (
                <div>
                  <strong className="text-zinc-700 dark:text-zinc-300">Sizes:</strong>{' '}
                  <span className="text-zinc-900 dark:text-zinc-100 font-medium">{recipient.preferences.clothingSize}</span>
                </div>
              )}
              {recipient.preferences.likes && (
                <div>
                  <strong className="text-zinc-700 dark:text-zinc-300">Likes / Hobbies:</strong>{' '}
                  <span className="text-zinc-600 dark:text-zinc-300">{recipient.preferences.likes}</span>
                </div>
              )}
              {recipient.preferences.dislikes && (
                <div>
                  <strong className="text-zinc-700 dark:text-zinc-300">Avoid:</strong>{' '}
                  <span className="text-zinc-600 dark:text-zinc-300">{recipient.preferences.dislikes}</span>
                </div>
              )}
            </div>
          )}

          {/* Wishlist items list */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Wishlist Items ({recipient.wishlist?.length || 0})
            </h4>
            <div className="space-y-2 text-xs">
              {(recipient.wishlist || []).map((item, idx) => (
                <div key={item.id} className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div className="flex justify-between font-semibold">
                    <span>{idx + 1}. {item.title}</span>
                    {item.price && <span className="text-emerald-700 dark:text-emerald-400 font-bold">{item.price}</span>}
                  </div>
                  {item.notes && <p className="text-[11px] text-zinc-500 mt-0.5">{item.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
