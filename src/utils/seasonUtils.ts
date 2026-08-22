/**
 * Calculates the default active season based on the current date.
 * Rule:
 * - Default season is '26/27' until the end of June 2027.
 * - From July 1st 2027 onwards, the default automatically shifts to the next season on July 1st of each year
 *   (e.g., July 1, 2027 -> '27/28', July 1, 2028 -> '28/29').
 */
export function getDefaultSeason(refDate: Date = new Date()): string {
  const july2027 = new Date(2027, 6, 1); // July 1, 2027
  if (refDate < july2027) {
    return '26/27';
  }

  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0 = Jan, 5 = June, 6 = July
  // From July 1st (month >= 6), start year is current year (e.g., 2027 -> '27/28')
  // Before July 1st (month < 6), start year is previous year (e.g., June 2028 -> '27/28')
  const startYear = month >= 6 ? year : year - 1;
  const endYear = startYear + 1;
  const startFormatted = String(startYear).slice(-2);
  const endFormatted = String(endYear).slice(-2);
  return `${startFormatted}/${endFormatted}`;
}

/**
 * Helper to predict the next logical season string based on an existing list of seasons.
 * e.g., if latest is '27/28', suggests '28/29'.
 */
export function getNextSuggestedSeason(existingSeasons: string[]): string {
  if (!existingSeasons || existingSeasons.length === 0) {
    return '28/29';
  }

  let maxYear = 0;
  existingSeasons.forEach(s => {
    const parts = s.split('/');
    if (parts.length === 2) {
      const startYr = parseInt(parts[0], 10);
      if (!isNaN(startYr) && startYr > maxYear) {
        maxYear = startYr;
      }
    }
  });

  if (maxYear === 0) return '28/29';

  const nextStart = maxYear + 1;
  const nextEnd = nextStart + 1;
  const startStr = String(nextStart).slice(-2).padStart(2, '0');
  const endStr = String(nextEnd).slice(-2).padStart(2, '0');
  return `${startStr}/${endStr}`;
}
