import { Participant, Assignment } from '../types';

/**
 * Pure random Secret Santa draw algorithm.
 * Guarantees a single unified giving cycle:
 * A -> B -> C -> ... -> A
 * Ensures no one is assigned to themselves and everyone gives and receives exactly one gift.
 */
export function generateSecretSantaDraw(participants: Participant[]): Assignment[] {
  if (participants.length < 2) {
    throw new Error('At least 2 participants are needed for a gift exchange.');
  }

  // Fisher-Yates shuffle
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const drawnAt = new Date().toISOString();
  const assignments: Assignment[] = [];

  for (let i = 0; i < shuffled.length; i++) {
    const santa = shuffled[i];
    const recipient = shuffled[(i + 1) % shuffled.length];

    assignments.push({
      santaId: santa.userId,
      santaName: santa.displayName,
      recipientId: recipient.userId,
      recipientName: recipient.displayName,
      drawnAt,
    });
  }

  return assignments;
}
