import React from 'react';
import { X, ExternalLink, Heart, AlertTriangle } from 'lucide-react';
import { Participant } from '../types';

interface ViewWishlistModalProps {
  participant: Participant | null;
  budget: string;
  onClose: () => void;
}

export const ViewWishlistModal: React.FC<ViewWishlistModalProps> = ({
  participant,
  budget,
  onClose,
}) => {
  if (!participant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          {participant.photoURL ? (
            <img
              src={participant.photoURL}
              alt={participant.displayName}
              className="w-11 h-11 rounded-full object-cover border-2 border-amber-300 dark:border-amber-600"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-red-800 text-white font-bold flex items-center justify-center text-sm">
              {participant.displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              {participant.displayName}&apos;s Wishlist
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Budget: {budget}</p>
          </div>
        </div>

        {/* Wishlist Items */}
        <div className="space-y-2 mb-5">
          <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            Items ({participant.wishlist?.length || 0})
          </h4>

          {(!participant.wishlist || participant.wishlist.length === 0) ? (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-center text-xs text-zinc-400 dark:text-zinc-500">
              No specific wishlist items added yet.
            </div>
          ) : (
            participant.wishlist.map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.title}</span>
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
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View web link</span>
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        {/* Preferences */}
        {(participant.preferences?.likes || participant.preferences?.dislikes || participant.preferences?.clothingSize || participant.preferences?.notes) && (
          <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
            {participant.preferences.likes && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1 mb-0.5">
                  <Heart className="w-3 h-3" /> Likes & Hobbies:
                </span>
                <p className="text-zinc-600 dark:text-zinc-300">{participant.preferences.likes}</p>
              </div>
            )}
            {participant.preferences.dislikes && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-0.5">
                  <AlertTriangle className="w-3 h-3" /> Please Avoid / Allergies:
                </span>
                <p className="text-zinc-600 dark:text-zinc-300">{participant.preferences.dislikes}</p>
              </div>
            )}
            {participant.preferences.clothingSize && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 block mb-0.5">Sizes:</span>
                <p className="text-zinc-600 dark:text-zinc-300">{participant.preferences.clothingSize}</p>
              </div>
            )}
            {participant.preferences.notes && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 block mb-0.5">Note for Santa:</span>
                <p className="text-zinc-600 dark:text-zinc-300">{participant.preferences.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
