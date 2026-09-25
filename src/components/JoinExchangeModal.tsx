import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { User, db, collection, query, where, getDocs, doc, setDoc, getDoc } from '../firebase';
import { Exchange, Participant } from '../types';

interface JoinExchangeModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onJoined: (exchange: Exchange) => void;
}

export const JoinExchangeModal: React.FC<JoinExchangeModalProps> = ({
  user,
  isOpen,
  onClose,
  onJoined,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a room code.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const q = query(collection(db, 'exchanges'), where('code', '==', cleanCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No gift exchange found with that room code.');
        return;
      }

      const exchangeDoc = querySnapshot.docs[0];
      const exchangeData = exchangeDoc.data() as Exchange;

      const participantRef = doc(db, 'exchanges', exchangeData.id, 'participants', user.uid);
      const participantSnap = await getDoc(participantRef);

      if (!participantSnap.exists()) {
        const newParticipant: Participant = {
          id: user.uid,
          userId: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Guest',
          email: user.email || '',
          photoURL: user.photoURL || undefined,
          isOrganizer: exchangeData.organizerId === user.uid,
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
        await setDoc(participantRef, newParticipant);
      }

      onJoined(exchangeData);
      onClose();
    } catch (err: any) {
      console.error('Error joining exchange:', err);
      setError(err.message || 'Failed to join exchange.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-white border border-zinc-200 rounded-xl p-6 shadow-xl text-zinc-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <h2 className="text-base font-bold text-zinc-900">Join an Exchange</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Enter the 6-character room code provided by your host
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Room Code
            </label>
            <input
              type="text"
              required
              placeholder="e.g. XMAS1234"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full text-center tracking-widest uppercase font-mono text-base bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Exchange'}
          </button>
        </form>
      </div>
    </div>
  );
};
