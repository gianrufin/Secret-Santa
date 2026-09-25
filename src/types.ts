export interface WishlistItem {
  id: string;
  title: string;
  price?: string;
  url?: string;
  notes?: string;
}

export interface ParticipantPreferences {
  likes: string;
  dislikes: string;
  clothingSize: string;
  notes: string;
}

export interface Participant {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isOrganizer: boolean;
  isWishlistReady: boolean;
  joinedAt: string;
  preferences: ParticipantPreferences;
  wishlist: WishlistItem[];
}

export interface Exchange {
  id: string;
  code: string;
  title: string;
  currency: string; // e.g. 'PHP', 'USD', 'EUR', 'GBP'
  budget: string;
  exchangeDate: string;
  registrationDeadline?: string; // date/time by which participants must register & finalize wishlists
  location: string;
  description?: string;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  status: 'registration' | 'drawn' | 'completed';
  isDrawUnlocked?: boolean; // Organizer unlocks draw once everyone is registered
  createdAt: string;
  drawnAt?: string;
}

export interface Assignment {
  santaId: string;
  santaName: string;
  recipientId: string;
  recipientName: string;
  drawnAt: string;
}

export interface AnonymousMessage {
  id: string;
  exchangeId: string;
  threadId?: string;
  recipientId: string; // the target person
  santaId: string; // the santa
  senderId: string; // who wrote it
  senderType: 'santa' | 'recipient';
  text: string;
  createdAt: string;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥',
  SGD: 'S$',
};

export function getCurrencySymbol(code?: string): string {
  if (!code) return '₱';
  return CURRENCY_SYMBOLS[code.toUpperCase()] || code;
}
