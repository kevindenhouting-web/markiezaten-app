import { Player, Match } from '../types';

/**
 * Checks if a player has an explicit or natural preference to start on the bench
 * or only play in the second half (e.g. Merijn, Jeffrey, Leon).
 */
export function isSecondHalfPreferred(player: Player): boolean {
  if (player.prefersSecondHalf !== undefined) {
    return player.prefersSecondHalf;
  }
  // Default recognition for Merijn, Jeffrey, Leon as specified by coach
  return /merijn|jeffrey|leon/i.test(player.name.trim());
}

/**
 * Checks if a player is marked present for a match
 */
export function isPlayerPresent(match: Match, playerId: string): boolean {
  return match.attendance?.[playerId] === 'present' || match.attendance?.[playerId] === true;
}

/**
 * Checks if a player is in the starting 11 lineup for a match
 */
export function isPlayerInLineup(match: Match, playerId: string): boolean {
  return Object.values(match.lineup || {}).includes(playerId);
}

/**
 * Checks if a match has a valid tactical lineup filled in
 */
export function hasMatchLineup(match: Match): boolean {
  return Object.keys(match.lineup || {}).length >= 7;
}

/**
 * Checks if a player started on the bench in a match
 * (meaning: player was present, match had a lineup, and player was not in the starting 11)
 */
export function didPlayerStartOnBench(match: Match, playerId: string): boolean {
  if (!isPlayerPresent(match, playerId)) return false;
  if (!hasMatchLineup(match)) return false;
  return !isPlayerInLineup(match, playerId);
}

/**
 * Returns all prior matches chronologically before currentMatch, most recent first
 */
export function getPriorMatches(currentMatch: Match, allMatches: Match[]): Match[] {
  const currentTimestamp = new Date(currentMatch.date).getTime();
  return allMatches
    .filter(m => m.id !== currentMatch.id && new Date(m.date).getTime() < currentTimestamp)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export interface PlayerBenchHistory {
  player: Player;
  prefersSecondHalf: boolean;
  startedOnBenchPreviousMatch: boolean;
  previousMatchOpponent?: string;
  previousMatchDate?: string;
  startedOnBenchLastAttendedMatch: boolean;
  lastAttendedMatchOpponent?: string;
  consecutiveBenchStarts: number;
  totalBenchStartsSeason: number;
  totalLineupStartsSeason: number;
  totalAttendedSeason: number;
}

/**
 * Calculates bench history and fair play metrics for a player prior to the current match
 */
export function getPlayerBenchHistory(
  player: Player,
  currentMatch: Match,
  allMatches: Match[]
): PlayerBenchHistory {
  const priorMatches = getPriorMatches(currentMatch, allMatches);
  const prefersSecondHalf = isSecondHalfPreferred(player);

  // Immediately preceding match with a lineup
  const immediatePriorMatch = priorMatches.find(m => hasMatchLineup(m));
  const startedOnBenchPreviousMatch = immediatePriorMatch 
    ? didPlayerStartOnBench(immediatePriorMatch, player.id) 
    : false;

  // Last match where the player was actually present
  const lastAttendedMatch = priorMatches.find(m => isPlayerPresent(m, player.id) && hasMatchLineup(m));
  const startedOnBenchLastAttendedMatch = lastAttendedMatch 
    ? didPlayerStartOnBench(lastAttendedMatch, player.id) 
    : false;

  // Consecutive bench starts leading up to this match (for attended matches with lineup)
  let consecutiveBenchStarts = 0;
  for (const m of priorMatches) {
    if (!isPlayerPresent(m, player.id)) continue;
    if (!hasMatchLineup(m)) continue;
    if (didPlayerStartOnBench(m, player.id)) {
      consecutiveBenchStarts++;
    } else {
      break;
    }
  }

  // Total stats for the season prior to or including past matches
  let totalBenchStartsSeason = 0;
  let totalLineupStartsSeason = 0;
  let totalAttendedSeason = 0;

  for (const m of priorMatches) {
    if (isPlayerPresent(m, player.id)) {
      totalAttendedSeason++;
      if (hasMatchLineup(m)) {
        if (isPlayerInLineup(m, player.id)) {
          totalLineupStartsSeason++;
        } else {
          totalBenchStartsSeason++;
        }
      }
    }
  }

  return {
    player,
    prefersSecondHalf,
    startedOnBenchPreviousMatch,
    previousMatchOpponent: immediatePriorMatch?.opponent,
    previousMatchDate: immediatePriorMatch?.date,
    startedOnBenchLastAttendedMatch,
    lastAttendedMatchOpponent: lastAttendedMatch?.opponent,
    consecutiveBenchStarts,
    totalBenchStartsSeason,
    totalLineupStartsSeason,
    totalAttendedSeason,
  };
}

export interface FairPlayOverview {
  // Players present today who started on the bench in the previous match
  previousBenchPlayersPresent: PlayerBenchHistory[];
  // Present players who started on bench last match and are NOT yet placed in starting 11 today
  unassignedPreviousBenchPlayers: PlayerBenchHistory[];
  // Present players who started on bench last match and ARE in starting 11 today
  assignedPreviousBenchPlayers: PlayerBenchHistory[];
  // Present players who currently sit on today's bench
  currentBenchPlayers: Player[];
}

/**
 * Computes the fair-play overview for the current match
 */
export function getMatchFairPlayOverview(
  currentMatch: Match,
  presentPlayers: Player[],
  allMatches: Match[]
): FairPlayOverview {
  const presentHistories = presentPlayers.map(p => getPlayerBenchHistory(p, currentMatch, allMatches));
  
  const previousBenchPlayersPresent = presentHistories.filter(h => h.startedOnBenchPreviousMatch || h.startedOnBenchLastAttendedMatch);
  
  const unassignedPreviousBenchPlayers = previousBenchPlayersPresent.filter(h => 
    !isPlayerInLineup(currentMatch, h.player.id)
  );
  
  const assignedPreviousBenchPlayers = previousBenchPlayersPresent.filter(h => 
    isPlayerInLineup(currentMatch, h.player.id)
  );

  const currentBenchPlayers = presentPlayers.filter(p => !isPlayerInLineup(currentMatch, p.id));

  return {
    previousBenchPlayersPresent,
    unassignedPreviousBenchPlayers,
    assignedPreviousBenchPlayers,
    currentBenchPlayers,
  };
}
