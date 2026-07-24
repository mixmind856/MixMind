import { useEffect, useMemo, useState } from "react";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday"
};

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const MODE_LABELS = {
  playlist: "Playlist Mode",
  dj: "DJ Mode"
};

function emptySchedule() {
  return {
    enabled: false,
    manualOverride: false,
    entries: []
  };
}

function normalizeIncoming(data) {
  const base = emptySchedule();
  if (!data) return base;
  base.enabled = !!data.enabled;
  base.manualOverride = !!data.manualOverride;
  base.entries = Array.isArray(data.entries)
    ? data.entries.map((e) => ({
        day: e.day || "monday",
        time: e.time || "08:00",
        mode: e.mode === "dj" ? "dj" : "playlist"
      }))
    : [];
  return base;
}

function newEntry(overrides = {}) {
  return {
    day: "monday",
    time: "08:00",
    mode: "playlist",
    ...overrides
  };
}

function parseTimeToMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatTime(value) {
  const mins = parseTimeToMinutes(value);
  if (mins === null) return value || "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function modeLabel(mode) {
  return MODE_LABELS[mode] || "None";
}

/**
 * Sort key: Monday→Sunday, then time ascending.
 */
function compareEntries(a, b) {
  const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
  if (dayDiff !== 0) return dayDiff;
  return (parseTimeToMinutes(a.time) ?? 0) - (parseTimeToMinutes(b.time) ?? 0);
}

/**
 * Venue-local day/time parts using IANA timezone.
 */
function getLocalParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "Europe/London",
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

  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const minute = Number(map.minute);
  const dayKey = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ][weekdayIndex];

  return {
    dayKey,
    dayIndex: weekdayIndex,
    minutes: hour * 60 + minute
  };
}

function entryWeekMinutes(entry) {
  const dayIndex = DAYS.indexOf(entry.day); // Mon=0 … Sun=6
  const timeMins = parseTimeToMinutes(entry.time);
  if (dayIndex < 0 || timeMins === null) return null;
  return dayIndex * 24 * 60 + timeMins;
}

function localWeekMinutes(local) {
  const mondayBased = (local.dayIndex + 6) % 7;
  return mondayBased * 24 * 60 + local.minutes;
}

/**
 * Next upcoming schedule event from local draft entries.
 * Updates live as the table is edited (before save).
 */
function computeNextChange(entries, timeZone, now = new Date()) {
  const valid = (entries || []).filter(
    (e) => DAYS.includes(e.day) && parseTimeToMinutes(e.time) !== null && e.mode
  );
  if (valid.length === 0) return null;

  const local = getLocalParts(now, timeZone);
  const nowMins = localWeekMinutes(local);
  const WEEK = 7 * 24 * 60;

  let best = null;
  let bestDelta = Infinity;

  for (const entry of valid) {
    const entryMins = entryWeekMinutes(entry);
    if (entryMins === null) continue;
    let delta = entryMins - nowMins;
    if (delta <= 0) delta += WEEK;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = entry;
    }
  }

  if (!best) return null;

  return {
    dayKey: best.day,
    dayLabel: DAY_LABELS[best.day],
    time: formatTime(best.time),
    mode: best.mode,
    modeLabel: modeLabel(best.mode),
    label: `${DAY_LABELS[best.day]} • ${formatTime(best.time)} • ${modeLabel(best.mode)}`
  };
}

function currentModeFromFlags(flags = {}) {
  if (flags.djMode) return "DJ Mode";
  if (flags.livePlaylistActive) return "Playlist Mode";
  return "None";
}

/**
 * Simple Day | Time | Mode schedule editor for Automatic Mode Switching.
 */
export default function AutomaticModeSwitching({
  schedule: initialSchedule,
  timezone: initialTimezone = "Europe/London",
  status: initialStatus = null,
  currentFlags = {},
  onFlagsChange,
  onScheduleChange
}) {
  const [schedule, setSchedule] = useState(() => normalizeIncoming(initialSchedule));
  const [timezone, setTimezone] = useState(initialTimezone || "Europe/London");
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    setSchedule(normalizeIncoming(initialSchedule));
    setTimezone(initialTimezone || "Europe/London");
    setStatus(initialStatus);
  }, [initialSchedule, initialTimezone, initialStatus]);

  // Refresh "next change" every minute so it stays accurate while the page is open
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const updateEntry = (index, field, value) => {
    setSchedule((prev) => {
      const entries = prev.entries.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      );
      return { ...prev, entries };
    });
  };

  const addEntry = () => {
    setSchedule((prev) => ({
      ...prev,
      entries: [...prev.entries, newEntry()]
    }));
  };

  const removeEntry = (index) => {
    setSchedule((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  const copyMondayToWeekdays = () => {
    setSchedule((prev) => {
      const mondayEntries = prev.entries.filter((e) => e.day === "monday");
      if (mondayEntries.length === 0) {
        setError("Add at least one Monday entry first.");
        return prev;
      }
      const withoutWeekdays = prev.entries.filter(
        (e) => !WEEKDAYS.includes(e.day) || e.day === "monday"
      );
      const copied = WEEKDAYS.filter((d) => d !== "monday").flatMap((day) =>
        mondayEntries.map((e) => ({ ...e, day }))
      );
      setSuccess("Copied Monday entries to all weekdays.");
      setError("");
      return { ...prev, entries: [...withoutWeekdays, ...copied] };
    });
  };

  const copyFridayToSaturday = () => {
    setSchedule((prev) => {
      const fridayEntries = prev.entries.filter((e) => e.day === "friday");
      if (fridayEntries.length === 0) {
        setError("Add at least one Friday entry first.");
        return prev;
      }
      const withoutSaturday = prev.entries.filter((e) => e.day !== "saturday");
      const copied = fridayEntries.map((e) => ({ ...e, day: "saturday" }));
      setSuccess("Copied Friday entries to Saturday.");
      setError("");
      return { ...prev, entries: [...withoutSaturday, ...copied] };
    });
  };

  const authHeaders = () => {
    const token = localStorage.getItem("venueToken");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const applyServerResponse = (data) => {
    if (data.automaticScheduling) {
      const normalized = normalizeIncoming(data.automaticScheduling);
      setSchedule(normalized);
      onScheduleChange?.(normalized);
    }
    if (data.timezone) setTimezone(data.timezone);
    if (data.status) setStatus(data.status);
    if (data.currentFlags && onFlagsChange) {
      onFlagsChange(data.currentFlags);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/venue/automatic-scheduling`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            timezone,
            automaticScheduling: schedule,
            applyNow: true
          })
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save schedule");
      }

      applyServerResponse(data);
      setSuccess("Automatic scheduling saved.");
    } catch (err) {
      setError(err.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchToManual = async () => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/venue/automatic-scheduling/manual`,
        { method: "POST", headers: authHeaders() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to switch to manual");
      applyServerResponse(data);
      setSchedule((prev) => ({ ...prev, manualOverride: true }));
      setSuccess("Switched to manual mode. Automatic scheduling paused.");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeAutomatic = async () => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/venue/automatic-scheduling/resume`,
        { method: "POST", headers: authHeaders() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resume automatic");
      applyServerResponse(data);
      setSchedule((prev) => ({ ...prev, manualOverride: false }));
      setSuccess("Resumed automatic scheduling.");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const control =
    status?.control ||
    (!schedule.enabled
      ? "disabled"
      : schedule.manualOverride
        ? "manual"
        : "automatic");

  const currentModeLabel =
    status?.currentModeLabel || currentModeFromFlags(currentFlags);

  // Always display sorted Mon→Sun, then time ascending (keeps original index for edits)
  const indexedEntries = useMemo(
    () =>
      schedule.entries
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) => compareEntries(a.entry, b.entry)),
    [schedule.entries]
  );

  // Live next-change from the draft schedule (updates as rows are edited)
  const nextChange = useMemo(
    () => computeNextChange(schedule.entries, timezone, new Date(nowTick)),
    [schedule.entries, timezone, nowTick]
  );

  return (
    <div className="bg-gradient-to-r from-slate-900/40 to-indigo-900/20 border border-slate-500/30 rounded-xl p-8 mb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Automatic Mode Switching</h2>
        <p className="text-gray-400 text-sm">
          Pick a day, time, and mode. MixMind switches at that time and stays
          there until the next scheduled change.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* Status card */}
      <div className="mb-6 rounded-lg border border-white/10 bg-black/30 px-5 py-4">
        {schedule.enabled ? (
          <>
            <p className="text-green-400 font-semibold mb-4">
              🟢 Automatic Scheduling Enabled
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Current Mode
                </p>
                <p className="text-white font-semibold text-lg">
                  {currentModeLabel}
                </p>
                {control === "manual" && (
                  <p className="text-amber-300 text-sm mt-1">👤 Manual override</p>
                )}
                {control === "automatic" && (
                  <p className="text-cyan-300 text-sm mt-1">🤖 Automatic</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Next Scheduled Change
                </p>
                {nextChange ? (
                  <p className="text-white font-semibold text-lg">
                    {nextChange.dayLabel} • {nextChange.time} •{" "}
                    {nextChange.modeLabel}
                  </p>
                ) : (
                  <p className="text-gray-500">No schedule entries yet</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-400 font-semibold">
            ⚪ Automatic Scheduling Disabled
          </p>
        )}
      </div>

      <label className="flex items-center gap-3 mb-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!schedule.enabled}
          onChange={(e) =>
            setSchedule((prev) => ({ ...prev, enabled: e.target.checked }))
          }
          className="w-5 h-5 accent-cyan-500"
        />
        <span className="font-semibold text-lg">Enable Automatic Scheduling</span>
      </label>

      {schedule.enabled && (
        <div className="flex flex-wrap gap-3 mb-6">
          {control === "automatic" ? (
            <button
              type="button"
              onClick={handleSwitchToManual}
              disabled={actionLoading}
              className="px-5 py-2 rounded-lg font-semibold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            >
              Switch to Manual
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResumeAutomatic}
              disabled={actionLoading}
              className="px-5 py-2 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50"
            >
              Resume Automatic
            </button>
          )}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white"
        >
          <option value="Europe/London">Europe/London</option>
          <option value="Europe/Dublin">Europe/Dublin</option>
          <option value="Europe/Paris">Europe/Paris</option>
          <option value="Europe/Berlin">Europe/Berlin</option>
          <option value="America/New_York">America/New_York</option>
          <option value="America/Los_Angeles">America/Los_Angeles</option>
          <option value="America/Chicago">America/Chicago</option>
          <option value="UTC">UTC</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          type="button"
          onClick={copyMondayToWeekdays}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-medium"
        >
          Copy Monday to All Weekdays
        </button>
        <button
          type="button"
          onClick={copyFridayToSaturday}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-medium"
        >
          Copy Friday to Saturday
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left min-w-[480px]">
          <thead className="bg-black/40 text-gray-300 text-sm">
            <tr>
              <th className="px-4 py-3 font-semibold">Day</th>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Mode</th>
              <th className="px-4 py-3 font-semibold w-36"></th>
            </tr>
          </thead>
          <tbody>
            {schedule.entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No schedule yet. Add a day, time, and mode to get started.
                </td>
              </tr>
            )}
            {indexedEntries.map(({ entry, index }) => (
              <tr key={index} className="border-t border-white/10 bg-black/20">
                <td className="px-4 py-3">
                  <select
                    value={entry.day}
                    onChange={(e) => updateEntry(index, "day", e.target.value)}
                    aria-label="Edit Day"
                    className="bg-black/40 border border-white/20 rounded px-3 py-2 text-white w-full"
                  >
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {DAY_LABELS[day]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={entry.time}
                    onChange={(e) => updateEntry(index, "time", e.target.value)}
                    aria-label="Edit Time"
                    className="bg-black/40 border border-white/20 rounded px-3 py-2 text-white"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={entry.mode}
                    onChange={(e) => updateEntry(index, "mode", e.target.value)}
                    aria-label="Edit Mode"
                    className="bg-black/40 border border-white/20 rounded px-3 py-2 text-white w-full"
                  >
                    <option value="playlist">Playlist Mode</option>
                    <option value="dj">DJ Mode</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => removeEntry(index)}
                    className="text-red-300 hover:text-red-200 text-sm font-medium"
                  >
                    Remove Schedule
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addEntry}
          className="px-5 py-2 rounded-lg font-semibold bg-white/10 hover:bg-white/20 border border-white/20"
        >
          + Add Schedule
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Schedule"}
        </button>
      </div>
    </div>
  );
}
