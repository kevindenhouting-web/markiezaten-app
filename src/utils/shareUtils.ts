import { Match, Player } from '../types';
import { FORMATIONS } from '../constants';
import { calculateDefaultGatheringTime, formatMatchDate, formatMatchTime } from './matchParser';

/**
 * Checks if current device is a mobile device or tablet.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
}

/**
 * Generates an emoji-rich, structured WhatsApp message for match announcement / attendance polling.
 * Focuses strictly on: Opponent, Home/Away location, Kickoff time, Gathering time, and attendance call-to-action.
 */
export function generateMatchWhatsAppText(match: Match): string {
  const isHome = match.isHome;
  const matchTitle = isHome ? `VV de Markiezaten - ${match.opponent}` : `${match.opponent} - VV de Markiezaten`;
  const matchDate = formatMatchDate(match.date);
  const kickoff = formatMatchTime(match.date);
  const gatheringTimeVal = match.gatheringTime || calculateDefaultGatheringTime(match.date, match.isHome);
  const gathering = gatheringTimeVal ? `${gatheringTimeVal} uur` : 'Nader te bepalen';
  const typeBadge = isHome ? 'Thuis' : 'Uit';

  let text = `⚽ *AANKOMENDE WEDSTRIJD* ⚽\n`;
  text += `*${matchTitle}* (${typeBadge})\n\n`;
  text += `📅 *Datum:* ${matchDate}\n`;
  text += `⏰ *Aanvang:* ${kickoff} uur\n`;
  text += `⏱️ *Verzamelen:* ${gathering}\n\n`;
  text += `_Verzonden via De Markiezaten Team Manager_`;
  return text;
}

/**
 * Generates an emoji-rich, structured WhatsApp message for match lineup.
 */
export function generateLineupWhatsAppText(match: Match, players: Player[]): string {
  const isHome = match.isHome;
  const matchTitle = isHome ? `VV de Markiezaten - ${match.opponent}` : `${match.opponent} - VV de Markiezaten`;
  const matchDate = formatMatchDate(match.date);
  const kickoff = formatMatchTime(match.date);
  const gatheringTimeVal = match.gatheringTime || calculateDefaultGatheringTime(match.date, match.isHome);
  const formation = match.formation || '4-4-2';
  const formationDef = FORMATIONS[formation] || FORMATIONS['4-4-2'];

  const present = players.filter(p => match.attendance?.[p.id] === 'present' || match.attendance?.[p.id] === true);
  const assignedPlayerIds = Object.values(match.lineup || {});
  const subs = present.filter(p => !assignedPlayerIds.includes(p.id));

  let text = `📋 *TACTISCHE OPSTELLING (${formation})* 📋\n`;
  text += `*${matchTitle}*\n`;
  text += `📅 ${matchDate} om ${kickoff} uur\n`;
  if (gatheringTimeVal) {
    text += `⏱️ Verzamelen: ${gatheringTimeVal} uur\n`;
  }
  text += `\n⚽ *Basisopstelling:*\n`;

  formationDef.positions.forEach(pos => {
    const playerId = match.lineup?.[pos.key];
    const player = playerId ? players.find(p => p.id === playerId) : null;
    text += `• *${pos.label}:* ${player ? player.name : '—'}\n`;
  });

  if (subs.length > 0) {
    text += `\n💺 *Wissels (${subs.length}):*\n`;
    text += subs.map(p => `• ${p.name}`).join('\n') + '\n';
  }

  text += `\n_Verzonden via De Markiezaten Team Manager_`;
  return text;
}

/**
 * Opens WhatsApp directly with the prefilled message.
 */
export function openWhatsAppShare(text: string): void {
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Safely copies text to clipboard with fallback.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('Clipboard writeText failed, trying fallback:', e);
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
}

/**
 * Invokes native Web Share API with a File or URL.
 */
export async function shareFileOrText(options: {
  title: string;
  text: string;
  file?: File;
}): Promise<'shared' | 'unsupported' | 'cancelled' | 'error'> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return 'unsupported';
  }

  try {
    if (options.file && navigator.canShare && navigator.canShare({ files: [options.file] })) {
      await navigator.share({
        title: options.title,
        text: options.text,
        files: [options.file]
      });
      return 'shared';
    } else {
      await navigator.share({
        title: options.title,
        text: options.text
      });
      return 'shared';
    }
  } catch (err: any) {
    if (err && (err.name === 'AbortError' || err.code === 20)) {
      return 'cancelled';
    }
    console.warn('navigator.share failed:', err);
    return 'error';
  }
}

/**
 * Safely triggers download of a blob or opens it in a new window.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (err) {
    console.error('Download blob failed:', err);
  }
}
