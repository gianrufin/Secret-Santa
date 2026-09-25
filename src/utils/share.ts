import { Exchange } from '../types';

/**
 * Generates a clean direct link to the party exchange,
 * correctly handling sub-directories like GitHub Pages (/repo-name/)
 * or root domains.
 */
export function getPartyShareUrl(code: string): string {
  if (typeof window === 'undefined') return `?code=${code}`;
  try {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('code', code.toUpperCase());
    return url.toString();
  } catch (e) {
    return `${window.location.origin}${window.location.pathname}?code=${code.toUpperCase()}`;
  }
}

/**
 * Formats a ready-to-share message for messaging apps (WhatsApp, Telegram, Messenger, SMS, etc.)
 */
export function formatPartyInviteMessage(exchange: Exchange): string {
  const link = getPartyShareUrl(exchange.code);
  return `🎄 Secret Santa Gift Exchange: "${exchange.title}"\n💰 Budget: ${exchange.budget}\n📅 When: ${exchange.exchangeDate}\n📍 Where: ${exchange.location}\n🎁 Room Code: ${exchange.code}\n\n👉 Join directly using this link:\n${link}`;
}
