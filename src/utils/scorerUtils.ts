import { Player, Match } from '../types';
import { isMatchCompleted } from './matchParser';

/**
 * Checks if a scorer entry corresponds to a given player.
 * Supports:
 * - Direct ID match
 * - Case-insensitive ID or Name match
 * - Scorer string format variations (e.g. "Twan", "Twan (2x)", UUID)
 * - Object structure if present ({ playerId, id, name })
 */
export function isScorerForPlayer(scorer: any, player: Player): boolean {
  if (!scorer || !player) return false;

  const targetId = (player.id || '').trim().toLowerCase();
  const targetName = (player.name || '').trim().toLowerCase();

  if (typeof scorer === 'string') {
    const cleanScorer = scorer.trim().toLowerCase();
    
    // Direct matches
    if (cleanScorer === targetId || cleanScorer === targetName) {
      return true;
    }

    // Match if name is at the start (e.g., "Twan (2)", "Twan - penalty")
    if (targetName && cleanScorer.startsWith(targetName)) {
      return true;
    }

    return false;
  }

  if (typeof scorer === 'object') {
    const sId = (scorer.playerId || scorer.id || '').toString().trim().toLowerCase();
    const sName = (scorer.name || '').toString().trim().toLowerCase();

    if (sId && (sId === targetId || sId === targetName)) return true;
    if (sName && (sName === targetName || sName === targetId)) return true;
  }

  return false;
}

/**
 * Returns whether a match should be considered as played or possessing recorded results.
 * Rule:
 * - Kickoff + 120 minutes has elapsed (isMatchCompleted)
 * - OR a score has been recorded (match.score)
 * - OR goal scorers have been recorded (match.scorers.length > 0)
 */
export function isMatchPlayedOrHasResult(match: Match): boolean {
  if (!match) return false;
  if (isMatchCompleted(match.date)) return true;
  if (match.score !== undefined && (typeof match.score.home === 'number' || typeof match.score.away === 'number')) {
    return true;
  }
  if (Array.isArray(match.scorers) && match.scorers.length > 0) {
    return true;
  }
  return false;
}

/**
 * Returns the number of goals scored by a player in a specific match.
 */
export function getMatchGoalsForPlayer(match: Match, player: Player): number {
  if (!match || !Array.isArray(match.scorers) || match.scorers.length === 0 || !player) {
    return 0;
  }

  let count = 0;
  for (const scorer of match.scorers) {
    if (isScorerForPlayer(scorer, player)) {
      if (typeof scorer === 'object' && typeof (scorer as any).count === 'number') {
        count += (scorer as any).count;
      } else {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * Computes the total goals scored by a player across all valid/played matches.
 */
export function getPlayerTotalGoals(player: Player, matches: Match[]): number {
  if (!player || !Array.isArray(matches)) return 0;

  return matches.reduce((total, match) => {
    if (!isMatchPlayedOrHasResult(match)) return total;
    return total + getMatchGoalsForPlayer(match, player);
  }, 0);
}

export interface GroupedScorer {
  playerId: string;
  name: string;
  count: number;
}

/**
 * Groups a match's scorers into a clean summary list with player IDs, names, and goal counts.
 */
export function getMatchGroupedScorers(match: Match, players: Player[]): GroupedScorer[] {
  if (!match || !Array.isArray(match.scorers) || match.scorers.length === 0) {
    return [];
  }

  const groupedMap = new Map<string, { playerId: string; name: string; count: number }>();

  match.scorers.forEach((scorer) => {
    // Find matching player
    const matchedPlayer = players.find(p => isScorerForPlayer(scorer, p));
    const key = matchedPlayer ? matchedPlayer.id : (typeof scorer === 'string' ? scorer : 'onbekend');
    const name = matchedPlayer ? matchedPlayer.name : (typeof scorer === 'string' ? scorer : 'Onbekend');

    const existing = groupedMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groupedMap.set(key, {
        playerId: key,
        name,
        count: 1
      });
    }
  });

  return Array.from(groupedMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * Returns the number of goals FC De Markiezaten scored in the match.
 */
export function getMarkiezatenTeamGoals(match: Match): number {
  if (!match || !match.score) return 0;
  return match.isHome ? (match.score.home || 0) : (match.score.away || 0);
}
