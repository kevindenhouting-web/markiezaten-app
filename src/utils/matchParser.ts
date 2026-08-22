import { NewMatchInput } from '../types';

/**
 * Calculates a default gathering time based on match kickoff time and home/away status.
 * Home: default 45 min before kickoff.
 * Away: default 60 min before kickoff.
 */
export function calculateDefaultGatheringTime(matchTimeOrDateTime: string, isHome: boolean): string {
  if (!matchTimeOrDateTime) return '';

  let hours = 14;
  let minutes = 30;

  if (matchTimeOrDateTime.includes('T')) {
    const timePart = matchTimeOrDateTime.split('T')[1];
    if (timePart) {
      const [h, m] = timePart.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        hours = h;
        minutes = m;
      }
    }
  } else if (matchTimeOrDateTime.includes(':')) {
    const [h, m] = matchTimeOrDateTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      hours = h;
      minutes = m;
    }
  }

  const offsetMinutes = isHome ? 45 : 60;
  let totalMinutes = hours * 60 + minutes - offsetMinutes;
  if (totalMinutes < 0) totalMinutes += 24 * 60;

  const gatherH = Math.floor(totalMinutes / 60);
  const gatherM = totalMinutes % 60;

  return `${String(gatherH).padStart(2, '0')}:${String(gatherM).padStart(2, '0')}`;
}

/**
 * Adds weeks to a given ISO datetime string (YYYY-MM-DDTHH:mm) or returns next Saturday 14:30.
 */
export function addWeeksToDateTime(dateTimeStr: string, weeks: number = 1): string {
  if (!dateTimeStr) {
    return getNextDefaultMatchDateTime();
  }

  try {
    const [dPart, tPart] = dateTimeStr.split('T');
    if (dPart) {
      const [y, m, d] = dPart.split('-').map(Number);
      if (y && m && d) {
        const dateObj = new Date(y, m - 1, d);
        dateObj.setDate(dateObj.getDate() + (weeks * 7));
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const time = tPart || '14:30';
        return `${yyyy}-${mm}-${dd}T${time}`;
      }
    }
    return getNextDefaultMatchDateTime();
  } catch {
    return getNextDefaultMatchDateTime();
  }
}

/**
 * Returns the upcoming Saturday at 14:30 in YYYY-MM-DDTHH:mm format.
 */
export function getNextDefaultMatchDateTime(): string {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 6 is Saturday
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  const nextSaturday = new Date(now);
  nextSaturday.setDate(now.getDate() + daysUntilSaturday);
  const yyyy = nextSaturday.getFullYear();
  const mm = String(nextSaturday.getMonth() + 1).padStart(2, '0');
  const dd = String(nextSaturday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T14:30`;
}

/**
 * Formats a Date object to YYYY-MM-DDTHH:mm string for datetime-local input.
 */
export function formatToDateTimeLocal(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/**
 * Safe formatter for match date without timezone distortion.
 */
export function formatMatchDate(dateStr: string): string {
  if (!dateStr) return '';
  const [dPart] = dateStr.split('T');
  if (dPart) {
    const [y, m, d] = dPart.split('-').map(Number);
    if (y && m && d) {
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    }
  }
  return new Date(dateStr).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Safe formatter for match kickoff time (returns HH:mm).
 */
export function formatMatchTime(dateStr: string): string {
  if (!dateStr) return '14:30';
  if (dateStr.includes('T')) {
    const timePart = dateStr.split('T')[1];
    if (timePart && timePart.length >= 5) {
      return timePart.slice(0, 5);
    }
  }
  return '14:30';
}

const MONTH_NAMES: Record<string, number> = {
  'jan': 0, 'januari': 0, 'january': 0,
  'feb': 1, 'februari': 1, 'february': 1,
  'mrt': 2, 'maart': 2, 'mar': 2, 'march': 2,
  'apr': 3, 'april': 3,
  'mei': 4, 'may': 4,
  'jun': 5, 'juni': 5, 'june': 5,
  'jul': 6, 'juli': 6, 'july': 6,
  'aug': 7, 'augustus': 7, 'august': 7,
  'sep': 8, 'sept': 8, 'september': 8,
  'okt': 9, 'oct': 9, 'oktober': 9, 'october': 9,
  'nov': 10, 'november': 10,
  'dec': 11, 'december': 11
};

/**
 * Derives the appropriate calendar year for a given month in a season.
 * E.g., for season '26/27':
 * Months 7..12 (Jul-Dec) -> 2026
 * Months 1..6 (Jan-Jun)  -> 2027
 */
export function getYearForSeasonMonth(seasonOrYear: string | number | undefined, month: number): number {
  let startYear = new Date().getFullYear();
  if (typeof seasonOrYear === 'number') {
    startYear = seasonOrYear;
  } else if (typeof seasonOrYear === 'string' && seasonOrYear.trim()) {
    const parts = seasonOrYear.trim().split('/');
    if (parts.length === 2) {
      let y = parseInt(parts[0], 10);
      if (!isNaN(y)) {
        if (y < 100) y += 2000;
        startYear = y;
      }
    } else {
      const parsed = parseInt(seasonOrYear, 10);
      if (!isNaN(parsed)) {
        startYear = parsed < 100 ? parsed + 2000 : parsed;
      }
    }
  }

  // If month is July or later, it belongs to the starting autumn year
  return month >= 7 ? startYear : startYear + 1;
}

/**
 * Normalizes time formats (e.g. 14:30, 14.30, 14u30, 14u, 14h30, 14h, 14:30u, 14:30 uur) to standard HH:mm.
 */
export function normalizeTime(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase()
    .replace(/uur/g, '')
    .replace(/u$/, '')
    .replace(/h$/, '')
    .trim();

  // Pattern: HH:MM or HH.MM or HHuMM or HHhMM
  const m = clean.match(/^([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9])$/);
  if (m) {
    const h = String(parseInt(m[1], 10)).padStart(2, '0');
    const min = String(parseInt(m[2], 10)).padStart(2, '0');
    return `${h}:${min}`;
  }

  // Pattern: Just hour HH (e.g. "14" or "15")
  const mSingle = clean.match(/^([0-1]?[0-9]|2[0-3])$/);
  if (mSingle) {
    const h = String(parseInt(mSingle[1], 10)).padStart(2, '0');
    return `${h}:00`;
  }

  return null;
}

/**
 * Convert time string HH:mm to minutes from midnight for direct comparison.
 */
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * Parses tab-separated, semicolon-separated, or pipe-separated columns.
 */
function parseSeparatedColumns(parts: string[], seasonContext?: string | number): NewMatchInput | null {
  let dateStr = '';
  let timeFromDate: string | null = null;
  let opponent = '';
  let isHome: boolean | null = null;

  const foundTimes: { time: string; isExplicitGathering: boolean; isExplicitKickoff: boolean }[] = [];

  for (const part of parts) {
    const clean = part.trim();
    if (!clean) continue;
    const lower = clean.toLowerCase();

    // 1. Check Location / Home / Away
    if (lower === 'thuis' || lower === 'home' || lower === 't' || lower === 'thuiswedstrijd') {
      isHome = true;
      continue;
    }
    if (lower === 'uit' || lower === 'away' || lower === 'u' || lower === 'uitwedstrijd') {
      isHome = false;
      continue;
    }

    // 2. Check Explicit gathering keyword in cell
    const isGatherCell = /(?:verzamelen|aanwezig|verzamel|verzameltijd|inloop|omkleed)/i.test(lower);
    const isKickoffCell = /(?:aanvang|aftrap|kickoff|kick-off|start|begin|wedstrijd)/i.test(lower);

    // 3. Check Standalone or cell Time
    const timeMatch = clean.match(/(?:(?:om|aanvang|aftrap|verzamelen|aanwezig)\s*)?([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9])/i);
    const isTimeOnly = /^(?:om\s*)?([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9])(?:\s*u|\s*uur)?$/i.test(clean);

    if (isTimeOnly || (timeMatch && !clean.includes('-') && !clean.includes('/'))) {
      const rawNormalized = normalizeTime(clean) || (timeMatch ? normalizeTime(`${timeMatch[1]}:${timeMatch[2]}`) : null);
      if (rawNormalized) {
        foundTimes.push({
          time: rawNormalized,
          isExplicitGathering: isGatherCell,
          isExplicitKickoff: isKickoffCell
        });
        continue;
      }
    }

    // 4. Check Date in cell
    const dateParsed = tryParseDate(clean, seasonContext);
    if (dateParsed) {
      dateStr = dateParsed.dateStr;
      if (dateParsed.timeStr) {
        timeFromDate = dateParsed.timeStr;
      }
      continue;
    }

    // 5. Check if cell is opponent name or "Markiezaten - Opponent"
    if (!opponent) {
      if (lower.includes('markiezaten')) {
        if (lower.includes(' - ') || lower.includes(' vs ') || lower.includes(' tegen ')) {
          const vsParts = clean.split(/\s+-\s+|\s+vs\s+|\s+tegen\s+/i);
          if (vsParts.length === 2) {
            if (vsParts[0].toLowerCase().includes('markiezaten')) {
              opponent = cleanOpponentName(vsParts[1]);
              if (isHome === null) isHome = true;
            } else {
              opponent = cleanOpponentName(vsParts[0]);
              if (isHome === null) isHome = false;
            }
            continue;
          }
        }
      }
      opponent = cleanOpponentName(clean);
    }
  }

  if (!opponent) return null;
  if (isHome === null) isHome = true;

  // Resolve Match Kickoff Time and Gathering Time
  let kickoffTime = '14:30';
  let gatheringTime = '';

  if (timeFromDate) {
    kickoffTime = timeFromDate;
    // Any extra times can be gathering time
    const otherTime = foundTimes.find(t => t.time !== kickoffTime);
    if (otherTime) {
      gatheringTime = otherTime.time;
    }
  } else if (foundTimes.length === 1) {
    if (foundTimes[0].isExplicitGathering) {
      gatheringTime = foundTimes[0].time;
      kickoffTime = calculateDefaultGatheringTime(gatheringTime, isHome); // fallback
    } else {
      kickoffTime = foundTimes[0].time;
    }
  } else if (foundTimes.length >= 2) {
    const explicitKickoff = foundTimes.find(t => t.isExplicitKickoff);
    const explicitGathering = foundTimes.find(t => t.isExplicitGathering);

    if (explicitKickoff && explicitGathering) {
      kickoffTime = explicitKickoff.time;
      gatheringTime = explicitGathering.time;
    } else if (explicitGathering) {
      gatheringTime = explicitGathering.time;
      const other = foundTimes.find(t => t.time !== gatheringTime);
      if (other) kickoffTime = other.time;
    } else if (explicitKickoff) {
      kickoffTime = explicitKickoff.time;
      const other = foundTimes.find(t => t.time !== kickoffTime);
      if (other) gatheringTime = other.time;
    } else {
      // Compare both times: In football, gathering time is EARLIER than kickoff time!
      // Example: 13:45 and 14:30 -> Kickoff = 14:30, Gathering = 13:45.
      const t1 = foundTimes[0].time;
      const t2 = foundTimes[1].time;
      if (timeToMinutes(t1) < timeToMinutes(t2)) {
        gatheringTime = t1;
        kickoffTime = t2;
      } else {
        gatheringTime = t2;
        kickoffTime = t1;
      }
    }
  }

  if (!gatheringTime) {
    gatheringTime = calculateDefaultGatheringTime(kickoffTime, isHome);
  }

  if (!dateStr) {
    dateStr = formatToDateOnly(new Date());
  }

  return {
    opponent,
    date: `${dateStr}T${kickoffTime}`,
    isHome,
    gatheringTime
  };
}

/**
 * Parses a free-text line (e.g. from WhatsApp or speech or casual paste).
 */
function parseFreeTextLine(line: string, seasonContext?: string | number): NewMatchInput | null {
  let isHome = true;
  const lower = line.toLowerCase();

  // Location detection
  if (lower.includes(' uit') || lower.includes('(uit)') || lower.includes('[uit]') || lower.includes(' - uit') || lower.endsWith(' uit') || lower.includes('away')) {
    isHome = false;
  } else if (lower.includes(' thuis') || lower.includes('(thuis)') || lower.includes('[thuis]') || lower.includes(' - thuis') || lower.endsWith(' thuis') || lower.includes('home')) {
    isHome = true;
  }

  // 1. Explicit gathering time
  let explicitGatheringTime = '';
  const gatherMatch = line.match(/(?:verzamelen|aanwezig|verzamel|verzameltijd|inloop|omkleed)[\s:]*([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9])/i);
  if (gatherMatch) {
    const h = String(parseInt(gatherMatch[1], 10)).padStart(2, '0');
    const m = String(parseInt(gatherMatch[2], 10)).padStart(2, '0');
    explicitGatheringTime = `${h}:${m}`;
  }

  // 2. Explicit kickoff time
  let explicitKickoffTime = '';
  const kickoffMatch = line.match(/(?:aanvang|aftrap|kickoff|kick-off|start|begin|wedstrijd)[\s:]*([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9])/i);
  if (kickoffMatch) {
    const h = String(parseInt(kickoffMatch[1], 10)).padStart(2, '0');
    const m = String(parseInt(kickoffMatch[2], 10)).padStart(2, '0');
    explicitKickoffTime = `${h}:${m}`;
  }

  // 3. Find all times mentioned in line
  const timeRegex = /(?:om\s+)?([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9])/gi;
  let matchFound: RegExpExecArray | null;
  const allFoundTimes: string[] = [];
  while ((matchFound = timeRegex.exec(line)) !== null) {
    const h = String(parseInt(matchFound[1], 10)).padStart(2, '0');
    const m = String(parseInt(matchFound[2], 10)).padStart(2, '0');
    const timeFormatted = `${h}:${m}`;
    if (!allFoundTimes.includes(timeFormatted)) {
      allFoundTimes.push(timeFormatted);
    }
  }

  let finalKickoff = '14:30';
  let finalGathering = explicitGatheringTime;

  if (explicitKickoffTime) {
    finalKickoff = explicitKickoffTime;
  } else if (allFoundTimes.length === 1) {
    if (explicitGatheringTime && allFoundTimes[0] === explicitGatheringTime) {
      // Only gathering time was provided -> Kickoff is calculated
      finalGathering = explicitGatheringTime;
      finalKickoff = calculateDefaultGatheringTime(finalGathering, isHome);
    } else {
      finalKickoff = allFoundTimes[0];
    }
  } else if (allFoundTimes.length >= 2) {
    if (explicitGatheringTime) {
      const other = allFoundTimes.find(t => t !== explicitGatheringTime);
      finalKickoff = other || '14:30';
    } else {
      // Two times provided without labels (e.g., "Za 5 sep 13:45 / 14:30 vs RBC")
      // In football, earlier time is gathering, later time is kickoff!
      const t1 = allFoundTimes[0];
      const t2 = allFoundTimes[1];
      if (timeToMinutes(t1) < timeToMinutes(t2)) {
        finalGathering = t1;
        finalKickoff = t2;
      } else {
        finalGathering = t2;
        finalKickoff = t1;
      }
    }
  }

  // Extract Date
  let dateStr = '';
  // Pattern 1: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const fullDateMatch = line.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (fullDateMatch) {
    const d = parseInt(fullDateMatch[1], 10);
    const m = parseInt(fullDateMatch[2], 10);
    let y = parseInt(fullDateMatch[3], 10);
    if (y < 100) y += 2000;
    dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  } else {
    // Pattern 2: DD-MM or DD/MM (short date, infer year from season)
    const shortDateMatch = line.match(/\b(\d{1,2})[-/.](\d{1,2})\b/);
    if (shortDateMatch) {
      const d = parseInt(shortDateMatch[1], 10);
      const m = parseInt(shortDateMatch[2], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const y = getYearForSeasonMonth(seasonContext, m);
        dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  if (!dateStr) {
    // Pattern 3: Named month (e.g. "12 september" or "5 sep 2026")
    const namedMonthMatch = line.match(/(\d{1,2})\s+([a-zA-Z]{3,9})(?:\s+(\d{4}))?/i);
    if (namedMonthMatch) {
      const d = parseInt(namedMonthMatch[1], 10);
      const monthWord = namedMonthMatch[2].toLowerCase();
      if (MONTH_NAMES[monthWord] !== undefined) {
        const m = MONTH_NAMES[monthWord] + 1;
        const y = namedMonthMatch[3] 
          ? parseInt(namedMonthMatch[3], 10) 
          : getYearForSeasonMonth(seasonContext, m);
        dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  if (!dateStr) {
    dateStr = formatToDateOnly(new Date());
  }

  // Extract Opponent by removing known tokens
  let cleanLine = line
    .replace(/(?:verzamelen|aanwezig|verzamel|verzameltijd|inloop|omkleed)[\s:]*([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9])/gi, '')
    .replace(/(?:aanvang|aftrap|kickoff|kick-off|start|begin|wedstrijd)[\s:]*([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9])/gi, '')
    .replace(/(?:om\s+)?([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9])(?:\s*u|\s*uur)?/gi, '')
    .replace(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/g, '')
    .replace(/\b(\d{1,2})[-/.](\d{1,2})\b/g, '')
    .replace(/(\d{1,2})\s+([a-zA-Z]{3,9})(?:\s+(\d{4}))?/gi, '')
    .replace(/\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|zat|zon|ma|di|wo|do|vr|za|zo)\b/gi, '')
    .replace(/\b(thuis|uit|home|away|thuiswedstrijd|uitwedstrijd)\b/gi, '')
    .replace(/\b(vv markiezaten|fc markiezaten|de markiezaten|markiezaten 1|markiezaten 2|markiezaten 3|markiezaten)\b/gi, '')
    .replace(/\b(vs|tegen|tegenstander)\b/gi, '')
    .replace(/[()[\]{}|]/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const opponent = cleanOpponentName(cleanLine);
  if (!opponent || opponent.length < 2) return null;

  if (!finalGathering) {
    finalGathering = calculateDefaultGatheringTime(finalKickoff, isHome);
  }

  return {
    opponent,
    date: `${dateStr}T${finalKickoff}`,
    isHome,
    gatheringTime: finalGathering
  };
}

/**
 * Attempts to parse date and time from a string chunk.
 */
function tryParseDate(str: string, seasonContext?: string | number): { dateStr: string; timeStr?: string } | null {
  const clean = str.trim();

  // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.split(/[ T]/);
    const datePart = parts[0];
    const timePart = parts[1] ? normalizeTime(parts[1]) : undefined;
    return { dateStr: datePart, timeStr: timePart || undefined };
  }

  // DD-MM-YYYY or DD/MM/YYYY with optional time
  const mFull = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[ T]([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9]))?$/i);
  if (mFull) {
    const d = parseInt(mFull[1], 10);
    const month = parseInt(mFull[2], 10);
    let y = parseInt(mFull[3], 10);
    if (y < 100) y += 2000;
    const timePart = mFull[4] && mFull[5] ? normalizeTime(`${mFull[4]}:${mFull[5]}`) : undefined;
    return {
      dateStr: `${y}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      timeStr: timePart || undefined
    };
  }

  // DD-MM or DD/MM with optional time (infer year from season)
  const mShort = clean.match(/^(\d{1,2})[-/.](\d{1,2})(?:[ T]([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9]))?$/i);
  if (mShort) {
    const d = parseInt(mShort[1], 10);
    const month = parseInt(mShort[2], 10);
    if (month >= 1 && month <= 12 && d >= 1 && d <= 31) {
      const y = getYearForSeasonMonth(seasonContext, month);
      const timePart = mShort[3] && mShort[4] ? normalizeTime(`${mShort[3]}:${mShort[4]}`) : undefined;
      return {
        dateStr: `${y}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        timeStr: timePart || undefined
      };
    }
  }

  // Named month: e.g. "12 sep" or "12 september" or "12 sep 2026"
  const mNamed = clean.match(/^(\d{1,2})\s+([a-zA-Z]{3,9})(?:\s+(\d{4}))?(?:[ T]([0-1]?[0-9]|2[0-3])[:.uh]([0-5][0-9]))?$/i);
  if (mNamed) {
    const d = parseInt(mNamed[1], 10);
    const monthWord = mNamed[2].toLowerCase();
    if (MONTH_NAMES[monthWord] !== undefined) {
      const month = MONTH_NAMES[monthWord] + 1;
      const y = mNamed[3] ? parseInt(mNamed[3], 10) : getYearForSeasonMonth(seasonContext, month);
      const timePart = mNamed[4] && mNamed[5] ? normalizeTime(`${mNamed[4]}:${mNamed[5]}`) : undefined;
      return {
        dateStr: `${y}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        timeStr: timePart || undefined
      };
    }
  }

  return null;
}

function formatToDateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function cleanOpponentName(raw: string): string {
  return raw
    .replace(/^[-\s:|/,]+|[-\s:|/,]+$/g, '')
    .trim();
}

/**
 * Parse a single line of text into a NewMatchInput candidate.
 */
export function parseMatchLine(rawLine: string, seasonContext?: string | number): NewMatchInput | null {
  const line = rawLine.trim();
  if (!line || line.startsWith('#') || line.startsWith('//')) return null;

  // Handle Tab-separated, Semicolon, or Pipe separated rows (e.g. from Excel)
  const delimiters = ['\t', ';', '|'];
  for (const delim of delimiters) {
    if (line.includes(delim)) {
      const parts = line.split(delim).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const parsed = parseSeparatedColumns(parts, seasonContext);
        if (parsed) return parsed;
      }
    }
  }

  return parseFreeTextLine(line, seasonContext);
}

/**
 * Bulk parse multi-line text into array of matches.
 */
export function parseBulkMatchText(rawText: string, seasonContext?: string | number): NewMatchInput[] {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText.split(/\r?\n/);
  const results: NewMatchInput[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const parsed = parseMatchLine(line, seasonContext);
    if (parsed && parsed.opponent.trim()) {
      results.push(parsed);
    }
  }

  return results;
}
