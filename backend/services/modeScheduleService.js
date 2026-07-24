/**
 * Automatic mode scheduling — simple weekly switch events.
 *
 * Each entry: { day, time, mode }
 * Example: Monday 08:00 → Playlist, Monday 20:00 → DJ
 *
 * At/after an event, that mode stays active until the next event.
 */

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const MODES = ["playlist", "dj"];
const DEFAULT_TIMEZONE = "Europe/London";

function defaultAutomaticScheduling() {
  return {
    enabled: false,
    manualOverride: false,
    entries: []
  };
}

function normalizeTimezone(tz) {
  if (!tz || typeof tz !== "string" || !tz.trim()) {
    return DEFAULT_TIMEZONE;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return tz.trim();
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function parseTimeToMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes) {
  const mins = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getLocalParts(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const tz = normalizeTimezone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23"
  }).formatToParts(date);

  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  const weekdayIndex = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6
  }[(map.weekday || "").toLowerCase().slice(0, 3)];

  if (weekdayIndex === undefined) {
    throw new Error(`Unable to resolve weekday: ${map.weekday}`);
  }

  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const minute = Number(map.minute);

  return {
    timeZone: tz,
    dayKey: DAYS[weekdayIndex],
    dayIndex: weekdayIndex,
    hour,
    minute,
    minutes: hour * 60 + minute
  };
}

function modeLabel(mode) {
  if (mode === "dj") return "DJ Mode";
  if (mode === "playlist") return "Playlist Mode";
  return "None";
}

function getCurrentModeFromFlags(venue) {
  if (venue?.djMode) return "dj";
  if (venue?.livePlaylistActive) return "playlist";
  return "none";
}

/**
 * Normalize entries from DB / API. Drops invalid rows. Sorts by day then time.
 */
function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];

  const cleaned = [];
  for (const raw of entries) {
    if (!raw) continue;
    const day = String(raw.day || "")
      .trim()
      .toLowerCase();
    const mode = String(raw.mode || "")
      .trim()
      .toLowerCase();
    const minutes = parseTimeToMinutes(raw.time);

    if (!DAY_KEYS.includes(day)) {
      throw new Error(`Invalid day: ${raw.day}`);
    }
    if (!MODES.includes(mode)) {
      throw new Error(`Invalid mode: ${raw.mode} (use playlist or dj)`);
    }
    if (minutes === null) {
      throw new Error(`Invalid time: ${raw.time}`);
    }

    cleaned.push({
      day,
      time: formatMinutes(minutes),
      mode
    });
  }

  // Stable sort: Monday→Sunday, then time
  cleaned.sort((a, b) => {
    const dayDiff = DAY_KEYS.indexOf(a.day) - DAY_KEYS.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
  });

  return cleaned;
}

function getEntries(automaticScheduling) {
  const raw = automaticScheduling?.entries;
  if (!Array.isArray(raw)) return [];
  try {
    return normalizeEntries(raw);
  } catch {
    // Tolerate partially invalid stored data when only reading for status
    return raw
      .filter(
        (e) =>
          e &&
          DAY_KEYS.includes(e.day) &&
          MODES.includes(e.mode) &&
          parseTimeToMinutes(e.time) !== null
      )
      .map((e) => ({
        day: e.day,
        time: formatMinutes(parseTimeToMinutes(e.time)),
        mode: e.mode
      }));
  }
}

/**
 * Minutes from start of week (Monday 00:00) for an entry.
 * Week starts Monday to match DAY_KEYS ordering.
 */
function entryWeekMinutes(entry) {
  const dayIndex = DAY_KEYS.indexOf(entry.day); // Mon=0 … Sun=6
  return dayIndex * 24 * 60 + parseTimeToMinutes(entry.time);
}

function localWeekMinutes(local) {
  // Convert Sunday=0…Saturday=6 → Monday=0…Sunday=6
  const mondayBased = (local.dayIndex + 6) % 7;
  return mondayBased * 24 * 60 + local.minutes;
}

/**
 * Mode that should be active now = most recent event in the weekly cycle.
 * Returns 'playlist' | 'dj' | null (no entries).
 */
function resolveScheduledMode(automaticScheduling, timeZone, now = new Date()) {
  if (!automaticScheduling?.enabled) return null;

  const entries = getEntries(automaticScheduling);
  if (entries.length === 0) return null;

  const local = getLocalParts(now, timeZone);
  const nowMins = localWeekMinutes(local);
  const WEEK = 7 * 24 * 60;

  let best = null;
  let bestDelta = Infinity;

  for (const entry of entries) {
    const entryMins = entryWeekMinutes(entry);
    // How long ago did this event fire? (wrap weekly)
    const delta = (nowMins - entryMins + WEEK) % WEEK;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = entry;
    }
  }

  return best ? best.mode : null;
}

/**
 * Next upcoming switch after now.
 */
function getNextScheduledChange(automaticScheduling, timeZone, now = new Date()) {
  if (!automaticScheduling?.enabled) return null;

  const entries = getEntries(automaticScheduling);
  if (entries.length === 0) return null;

  const local = getLocalParts(now, timeZone);
  const nowMins = localWeekMinutes(local);
  const WEEK = 7 * 24 * 60;

  let best = null;
  let bestDelta = Infinity;

  for (const entry of entries) {
    const entryMins = entryWeekMinutes(entry);
    let delta = entryMins - nowMins;
    if (delta <= 0) delta += WEEK; // next week occurrence
    if (delta < bestDelta) {
      bestDelta = delta;
      best = entry;
    }
  }

  if (!best) return null;

  return {
    mode: best.mode,
    modeLabel: modeLabel(best.mode),
    at: best.time,
    dayKey: best.day,
    label: `${modeLabel(best.mode)} at ${best.time}`
  };
}

function buildScheduleStatus(venue, now = new Date()) {
  const scheduling = venue?.automaticScheduling || defaultAutomaticScheduling();
  const timeZone = normalizeTimezone(venue?.timezone);
  const enabled = !!scheduling.enabled;
  const manualOverride = !!scheduling.manualOverride;
  const currentMode = getCurrentModeFromFlags(venue);
  const scheduledMode = enabled
    ? resolveScheduledMode(scheduling, timeZone, now)
    : null;
  const nextChange =
    enabled
      ? getNextScheduledChange(scheduling, timeZone, now)
      : null;

  return {
    enabled,
    manualOverride,
    control: !enabled ? "disabled" : manualOverride ? "manual" : "automatic",
    timezone: timeZone,
    currentMode,
    currentModeLabel: modeLabel(currentMode),
    scheduledMode,
    scheduledModeLabel: modeLabel(scheduledMode),
    nextChange: nextChange
      ? {
          mode: nextChange.mode,
          modeLabel: nextChange.modeLabel,
          at: nextChange.at,
          dayKey: nextChange.dayKey,
          dayLabel: capitalize(nextChange.dayKey),
          label: `${capitalize(nextChange.dayKey)} • ${nextChange.at} • ${nextChange.modeLabel}`
        }
      : null,
    entryCount: getEntries(scheduling).length
  };
}

function capitalize(dayKey) {
  return dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
}

function normalizeSchedulePayload(input = {}) {
  const result = defaultAutomaticScheduling();
  result.enabled = !!input.enabled;
  result.manualOverride = !!input.manualOverride;
  result.entries = normalizeEntries(input.entries || []);
  return result;
}

function defaultAutomaticSchedulingSafe(raw) {
  const base = defaultAutomaticScheduling();
  if (!raw) return base;
  return {
    enabled: !!raw.enabled,
    manualOverride: !!raw.manualOverride,
    entries: Array.isArray(raw.entries) ? getEntries({ entries: raw.entries }) : []
  };
}

module.exports = {
  DAYS,
  DAY_KEYS,
  MODES,
  DEFAULT_TIMEZONE,
  defaultAutomaticScheduling,
  defaultAutomaticSchedulingSafe,
  normalizeTimezone,
  parseTimeToMinutes,
  formatMinutes,
  getLocalParts,
  getEntries,
  resolveScheduledMode,
  getCurrentModeFromFlags,
  modeLabel,
  getNextScheduledChange,
  buildScheduleStatus,
  normalizeSchedulePayload
};
