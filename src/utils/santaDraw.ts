import { Participant, Assignment } from '../types';

/**
 * Super Random Secret Santa Draw Algorithm (Uniform Random Derangement).
 *
 * Guarantees:
 * 1. Zero duplicates: Every person gives to exactly ONE recipient, and every person receives from exactly ONE Santa.
 * 2. No self-draws: No participant can ever draw themselves (santaId !== recipientId).
 * 3. Pure, authentic randomness: Not restricted to a single Hamiltonian cycle, and not forced into pairs.
 *    Any valid derangement can occur with equal likelihood (pairs can happen naturally by chance, but aren't forced).
 */
export function generateSecretSantaDraw(participants: Participant[]): Assignment[] {
  if (participants.length < 2) {
    throw new Error('At least 2 participants are needed for a gift exchange.');
  }

  const n = participants.length;
  const original = [...participants];

  // Helper for cryptographically secure random float in [0, 1)
  const getRandom = (): number => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] / (0xffffffff + 1);
    }
    return Math.random();
  };

  // For 2 participants, reciprocal pair is the only possible derangement (A <-> B)
  if (n === 2) {
    const drawnAt = new Date().toISOString();
    return [
      {
        santaParticipantId: original[0].id,
        santaId: original[0].userId || original[0].id,
        santaName: original[0].displayName,
        recipientParticipantId: original[1].id,
        recipientId: original[1].userId || original[1].id,
        recipientName: original[1].displayName,
        drawnAt,
      },
      {
        santaParticipantId: original[1].id,
        santaId: original[1].userId || original[1].id,
        santaName: original[1].displayName,
        recipientParticipantId: original[0].id,
        recipientId: original[0].userId || original[0].id,
        recipientName: original[0].displayName,
        drawnAt,
      },
    ];
  }

  // Generate a true uniform random derangement via Fisher-Yates with early rejection.
  // The fraction of permutations that are derangements approaches 1/e ≈ 36.8%,
  // which means on average ~2.7 attempts are needed.
  let derangement: Participant[] = [];
  let isDerangement = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 500;

  while (!isDerangement && attempts < MAX_ATTEMPTS) {
    attempts++;
    const candidate = [...original];

    // Fisher-Yates shuffle
    for (let i = candidate.length - 1; i > 0; i--) {
      const j = Math.floor(getRandom() * (i + 1));
      [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
    }

    // Verify derangement constraint: candidate[i].id !== original[i].id for all i
    let valid = true;
    for (let i = 0; i < n; i++) {
      if (candidate[i].id === original[i].id) {
        valid = false;
        break;
      }
    }

    if (valid) {
      derangement = candidate;
      isDerangement = true;
    }
  }

  // Guaranteed fallback in the extremely rare scenario MAX_ATTEMPTS was exceeded
  if (!isDerangement) {
    // Generate a derangement by shifting by a random offset in [1, n-1]
    const shift = 1 + Math.floor(getRandom() * (n - 1));
    derangement = original.map((_, i) => original[(i + shift) % n]);

    // Swap any accidental self-matches (safety guard)
    for (let i = 0; i < n; i++) {
      if (derangement[i].id === original[i].id) {
        const swapTarget = (i + 1) % n;
        [derangement[i], derangement[swapTarget]] = [derangement[swapTarget], derangement[i]];
      }
    }
  }

  const drawnAt = new Date().toISOString();
  const assignments: Assignment[] = original.map((santa, idx) => {
    const recipient = derangement[idx];
    return {
      santaParticipantId: santa.id,
      santaId: santa.userId || santa.id,
      santaName: santa.displayName,
      recipientParticipantId: recipient.id,
      recipientId: recipient.userId || recipient.id,
      recipientName: recipient.displayName,
      drawnAt,
    };
  });

  return assignments;
}
