// Turns the flat list of InstanceSchedule rows (one per start_time*/stop_time*
// tag) the backend returns into per-server weekly views.
//
// The backend already resolves the cron's day-of-week field into a readable
// "days" string (see describe_cron_days in backend/subsystems/aws.py) -
// either "Every day", a comma-separated list of day names, or (if the field
// didn't parse) the raw cron field verbatim. Only the first two cases can be
// placed on a 7-day grid.

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_NAME_TO_INDEX = DAY_LABELS.reduce((map, label, index) => {
  map[label.toLowerCase()] = index;
  return map;
}, {});

function parseCronTime(cronExpression) {
  const parts = String(cronExpression || "").trim().split(/\s+/);
  if (parts.length < 5) return null;

  const minute = Number(parts[0]);
  const hour = Number(parts[1]);
  if (!Number.isInteger(minute) || !Number.isInteger(hour)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute, minutesOfDay: hour * 60 + minute };
}

function parseDayIndices(days) {
  const normalized = String(days || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "every day") return [0, 1, 2, 3, 4, 5, 6];

  const indices = normalized
    .split(",")
    .map((token) => DAY_NAME_TO_INDEX[token.trim()])
    .filter((index) => index !== undefined);

  return indices.length ? indices : null;
}

export function formatCronTime({ hour, minute }) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Groups schedule rows by server (instance) and splits each server's rows
// into events placeable on the weekly grid vs. ones whose cron didn't parse
// cleanly enough to place (irregular day-of-week fields, bad cron syntax).
export function groupSchedulesByServer(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const key = row.instance_id || `${row.region}::${row.private_ip}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        instanceId: row.instance_id,
        region: row.region,
        privateIp: row.private_ip,
        instanceName: row.instance_name,
        scheduleEnabled: row.schedule_enabled,
        events: [],
        unplaced: [],
      });
    }

    const group = groups.get(key);
    const time = parseCronTime(row.cron_expression);
    const dayIndices = parseDayIndices(row.days);

    if (time && dayIndices) {
      group.events.push({
        id: `${row.tag_key}-${row.cron_expression}`,
        action: row.action,
        scheduleEnabled: row.schedule_enabled,
        tagKey: row.tag_key,
        cronExpression: row.cron_expression,
        timeLabel: formatCronTime(time),
        minutesOfDay: time.minutesOfDay,
        dayIndices,
      });
    } else {
      group.unplaced.push(row);
    }
  });

  return [...groups.values()].sort((left, right) =>
    left.instanceName.localeCompare(right.instanceName, undefined, { numeric: true, sensitivity: "base" })
  );
}

// Events for one day, sorted earliest to latest - the "time sorting" a
// weekly view needs to actually read as a schedule.
export function eventsForDay(events, dayIndex) {
  return events
    .filter((event) => event.dayIndices.includes(dayIndex))
    .sort((left, right) => left.minutesOfDay - right.minutesOfDay);
}
