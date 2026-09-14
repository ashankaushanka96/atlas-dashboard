import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RestoreIcon from "@mui/icons-material/Restore";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import HistoryIcon from "@mui/icons-material/History";

import { API } from "../../services/auth";
import StatusChip from "./StatusChip";
import hexToRgb from "../shared/hexToRgb";
import { getWatcherRunningConfig } from "./statusConfig";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
});

const DAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const ALL_WEEK_DAYS = DAY_OPTIONS.map((option) => option.value);

const EMPTY_DRAFT = {
  tag: "",
  name: "",
  port: "",
  startTime: "00:00:00",
  endTime: "23:59:00",
  runningDates: [],
  maxUpDays: 1,
  needToUp: true,
  needToSendMail: true,
  runScriptPath: "",
  runScript: "run.sh",
  logDirectory: "",
};

function parseRunningDates(value) {
  if (!value) return [];
  const raw = String(value).trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map((part) => Number(part));
}

function parseYesNo(value) {
  return String(value || "").trim().toLowerCase() === "yes";
}

// Builds an editable draft from a config.ini entry as returned by the watcher
// (raw strings), for pre-filling the add/edit form.
function draftFromComponent(component) {
  return {
    tag: component.tag || "",
    name: component.name || "",
    port: component.port !== null && component.port !== undefined ? String(component.port) : "",
    startTime: component.startTime || "00:00:00",
    endTime: component.endTime || "23:59:00",
    runningDates: parseRunningDates(component.runningDates),
    maxUpDays: component.maxUpDays ? Number(component.maxUpDays) : 1,
    needToUp: parseYesNo(component.needToUp),
    needToSendMail: parseYesNo(component.needToSendMail),
    runScriptPath: component.runScriptPath || "",
    runScript: component.runScript || "run.sh",
    logDirectory: component.logDirectory || "",
  };
}

// config_meta comes straight from the DB's JSON column (a raw string via
// mysql-connector) when carried on a suggestion row, so it isn't safe to
// treat as an object without parsing first.
function parseConfigMeta(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return typeof raw === "object" ? raw : null;
}

// Suggestions carry either pre-resolved tag/port (the ComponentDB "Unconfigured"
// chip passes these via initialSuggestion) or a raw config_meta column (the
// in-modal "Suggested components" list). Both are ultimately collected by the
// watcher's component collector from each component's config.sh (COMPNAME/PORT),
// when one exists - not every component has one.
function suggestedTagPort(suggestion) {
  if (suggestion.tag !== undefined || suggestion.port !== undefined) {
    return { tag: suggestion.tag || "", port: suggestion.port };
  }
  const meta = parseConfigMeta(suggestion.config_meta);
  return { tag: meta?.tag || "", port: meta?.port ?? "" };
}

// The component collector reports comp_path as the component's top-level
// directory. Java components run their scripts directly out of that
// directory, but C++ components keep run.sh (and the rest of the binary) in
// a bin/ subdirectory of it.
function suggestedRunScriptPath(suggestion) {
  if (!suggestion.comp_path) return "";
  const isCpp = String(suggestion.platform || "").trim().toLowerCase() === "c++";
  return isCpp ? `${suggestion.comp_path}/bin` : suggestion.comp_path;
}

// Builds an editable draft from a component-collector suggestion (either the
// in-modal "Suggested components" list or one passed in via initialSuggestion),
// defaulting to a 24x7 schedule that the user can adjust before adding.
function draftFromSuggestion(suggestion) {
  const { tag, port } = suggestedTagPort(suggestion);
  return {
    tag: tag || "",
    name: suggestion.component_name || "",
    port: port !== null && port !== undefined && port !== "" ? String(port) : "",
    startTime: "00:00:00",
    endTime: "23:59:00",
    runningDates: [...ALL_WEEK_DAYS],
    maxUpDays: 7,
    needToUp: true,
    needToSendMail: true,
    runScriptPath: suggestedRunScriptPath(suggestion),
    runScript: "run.sh",
    logDirectory: suggestion.comp_path ? `${suggestion.comp_path}/logs` : "",
  };
}

// Tag chips cycle through the theme's semantic colors so they always match
// whatever primary/secondary/etc are set to, instead of arbitrary hex values.
const TAG_COLOR_KEYS = ["primary", "secondary", "info", "warning", "success"];

function buildTagPalette(theme) {
  return TAG_COLOR_KEYS.map((key) => ({
    bg: alpha(theme.palette[key].main, 0.16),
    color: theme.palette[key].light,
    border: alpha(theme.palette[key].main, 0.4),
  }));
}

function paletteForString(value, palette) {
  const str = String(value || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function DayChips({ days }) {
  const theme = useTheme();
  const active = new Set(days || []);
  return (
    <Box sx={{ display: "flex", gap: 0.5 }}>
      {DAY_OPTIONS.map((option) => {
        const isActive = active.has(option.value);
        return (
          <Box
            key={option.value}
            title={option.label}
            sx={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
              flexShrink: 0,
              bgcolor: isActive ? theme.palette.primary.main : alpha(theme.palette.text.primary, 0.05),
              color: isActive ? theme.palette.primary.contrastText : alpha(theme.palette.text.primary, 0.3),
              border: isActive ? "none" : `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
            }}
          >
            {option.label.charAt(0)}
          </Box>
        );
      })}
    </Box>
  );
}

DayChips.propTypes = {
  days: PropTypes.arrayOf(PropTypes.number),
};

DayChips.defaultProps = {
  days: [],
};

function ScheduleChips({ days, startTime, endTime }) {
  const theme = useTheme();
  return (
    <Stack spacing={0.75} alignItems="flex-start">
      <DayChips days={days} />
      <Chip
        icon={<AccessTimeIcon sx={{ fontSize: 14, color: `${theme.palette.primary.light} !important` }} />}
        label={`${startTime || "?"} – ${endTime || "?"}`}
        size="small"
        variant="outlined"
        sx={{ height: 22, borderColor: alpha(theme.palette.primary.main, 0.4), color: theme.palette.primary.light }}
      />
    </Stack>
  );
}

ScheduleChips.propTypes = {
  days: PropTypes.arrayOf(PropTypes.number),
  startTime: PropTypes.string,
  endTime: PropTypes.string,
};

ScheduleChips.defaultProps = {
  days: [],
  startTime: null,
  endTime: null,
};

// Section IDs are auto-generated from the component name: uppercase, spaces/hyphens
// become underscores. A collision gets a numeric suffix, e.g. TEST_COMP, then
// TEST_COMP_1, TEST_COMP_2, ...
function slugifySectionBase(name) {
  return String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function generateSectionId(name, usedIds) {
  const base = slugifySectionBase(name);
  if (!base) return "";
  if (!usedIds.has(base)) return base;
  let suffix = 1;
  while (usedIds.has(`${base}_${suffix}`)) suffix++;
  return `${base}_${suffix}`;
}

// The watcher merges sections sharing the same `name` into one logical
// component with multiple schedule windows (see components.py:
// build_components_from_parser). An additional window for an existing name
// follows a _SCHEDULE_n suffix instead of the generic numeric collision
// suffix, matching the convention already used when adding these by hand.
function generateScheduleSectionId(name, usedIds) {
  const base = slugifySectionBase(name);
  if (!base) return "";
  let suffix = 1;
  while (usedIds.has(`${base}_SCHEDULE_${suffix}`)) suffix++;
  return `${base}_SCHEDULE_${suffix}`;
}

// Section IDs are only ever regenerated from scratch for a brand new entry.
// While editing an existing one, keep using the plain generator (usedIds has
// already had editingSectionId removed from it) so a schedule-suffixed ID
// like TEST_COMP_SCHEDULE_2 is preserved instead of being recomputed.
function resolveSectionId(draft, usedIds, scheduleSiblings, editingSectionId) {
  if (!editingSectionId && scheduleSiblings.length > 0) {
    return generateScheduleSectionId(draft.name, usedIds);
  }
  return generateSectionId(draft.name, usedIds);
}

function normalizeComponentName(name) {
  return String(name || "").trim().toLowerCase();
}

// Mirrors the watcher's own scheduling math (components.py: _time_to_seconds
// and its end-before-start wrap rule) so a client-side conflict check agrees
// with how the watcher will actually schedule two windows against each other.
function timeStringToSeconds(value) {
  const [h, m, s] = String(value || "0:0:0")
    .split(":")
    .map((part) => Number(part) || 0);
  return h * 3600 + m * 60 + s;
}

function dayWindowToRange(day, startTime, endTime) {
  const startSeconds = day * 86400 + timeStringToSeconds(startTime);
  let endSeconds = day * 86400 + timeStringToSeconds(endTime);
  if (endSeconds < startSeconds) endSeconds += 86400;
  return [startSeconds, endSeconds];
}

function rangesOverlap([startA, endA], [startB, endB]) {
  return startA < endB && startB < endA;
}

// True if window A (days/startTime/endTime) would overlap window B on any
// shared day, accounting for windows that cross midnight.
function windowsConflict(daysA, startA, endA, daysB, startB, endB) {
  for (const dayA of daysA || []) {
    const rangeA = dayWindowToRange(dayA, startA, endA);
    for (const dayB of daysB || []) {
      if (rangesOverlap(rangeA, dayWindowToRange(dayB, startB, endB))) return true;
    }
  }
  return false;
}

// Other schedule sections - already configured on the watcher, or already
// queued in this session - that belong to the same component name as the
// draft. These are what a new (or edited) window has to be checked against.
function scheduleSiblingsForName(name, components, newComponents, excludeSectionId) {
  const normalized = normalizeComponentName(name);
  if (!normalized) return [];
  const siblings = [];
  components.forEach((component) => {
    if (component.section_id === excludeSectionId) return;
    if (normalizeComponentName(component.name) !== normalized) return;
    siblings.push({ sectionId: component.section_id, ...draftFromComponent(component) });
  });
  newComponents.forEach((component) => {
    if (component.section_id === excludeSectionId) return;
    if (normalizeComponentName(component.name) !== normalized) return;
    siblings.push({ sectionId: component.section_id, ...component });
  });
  return siblings;
}

function findScheduleConflict(draft, siblings) {
  for (const sibling of siblings) {
    if (
      windowsConflict(draft.runningDates, draft.startTime, draft.endTime, sibling.runningDates, sibling.startTime, sibling.endTime)
    ) {
      return `This schedule overlaps [${sibling.sectionId}] (${sibling.startTime}–${sibling.endTime}). Adjust the time/days, or edit that schedule instead.`;
    }
  }
  return null;
}

function draftValidationError(draft, sectionId) {
  if (!draft.name.trim()) return "Name is required.";
  if (!sectionId) return "Name must contain at least one letter or number to generate a section ID.";
  if (!draft.tag.trim()) return "Tag is required.";
  if (!draft.startTime.trim() || !draft.endTime.trim()) return "Start and end time are required.";
  if (!draft.runningDates.length) return "Select at least one running day.";
  if (!draft.runScriptPath.trim()) return "Run script path is required.";
  if (!draft.runScript.trim()) return "Run script is required.";
  return null;
}

const LIFECYCLE_LABELS = { start: "Start", stop: "Stop", restart: "Restart" };

function WatcherActionsModal({ open, row, initialSuggestion, onClose, onApplied }) {
  const theme = useTheme();
  const tagColorPalette = buildTagPalette(theme);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiUnreachable, setApiUnreachable] = useState(false);
  const [components, setComponents] = useState([]);
  const [pendingRemovals, setPendingRemovals] = useState(() => new Set());
  const [newComponents, setNewComponents] = useState([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState(null);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [restartAfterApply, setRestartAfterApply] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [resultSeverity, setResultSeverity] = useState("success");

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const addComponentSectionRef = useRef(null);

  const [running, setRunning] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [lifecycleError, setLifecycleError] = useState(null);
  const [lifecycleMessage, setLifecycleMessage] = useState(null);

  const [hasBackup, setHasBackup] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackResult, setRollbackResult] = useState(null);

  // 502/504 from the backend specifically means it couldn't reach the
  // watcher's own control API at all (connection refused / timed out) - a
  // different situation from "watcher API is up but rejected the request".
  const isUnreachableStatus = (status) => status === 502 || status === 504;

  const loadModalData = () => {
    if (!row) return;

    setLoading(true);
    setError(null);
    setApiUnreachable(false);
    setResultMessage(null);
    setResultSeverity("success");
    setPendingRemovals(new Set());
    setNewComponents([]);
    setDraft(initialSuggestion ? draftFromSuggestion(initialSuggestion) : EMPTY_DRAFT);
    setDraftError(null);
    setEditingSectionId(null);
    setShowSuggestions(false);
    setShowAddForm(Boolean(initialSuggestion));
    setLifecycleError(null);
    setLifecycleMessage(null);
    setConfirmAction(null);
    setRollbackResult(null);

    API.get("/watcher-control/fetch-components", {
      params: { region: row.region, ip: row.ip },
    })
      .then((response) => {
        setComponents(response.data.components || []);
        setHasBackup(Boolean(response.data.has_backup));
      })
      .catch((err) => {
        if (isUnreachableStatus(err.response?.status)) setApiUnreachable(true);
        setError(
          err.response?.data?.detail || err.response?.data?.error_message || "Failed to load watcher components."
        );
      })
      .finally(() => {
        setLoading(false);
        if (initialSuggestion) {
          // The add-component form only mounts once loading finishes, so wait
          // a tick for the ref to attach before scrolling to it.
          window.setTimeout(() => {
            addComponentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 0);
        }
      });

    setStatusLoading(true);
    API.get("/watcher-control/status", {
      params: { region: row.region, ip: row.ip },
    })
      .then((response) => setRunning(Boolean(response.data.running)))
      .catch((err) => {
        if (isUnreachableStatus(err.response?.status)) setApiUnreachable(true);
        setRunning(null);
      })
      .finally(() => setStatusLoading(false));

    setSuggestionsLoading(true);
    API.get("/components/fetch-components-by-ip", {
      params: { region: row.region, ip: row.ip },
    })
      .then((response) => {
        const all = response.data.components || [];
        setSuggestions(all.filter((component) => component.watcher !== "Configured"));
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  };

  useEffect(() => {
    if (!open || !row) return;
    loadModalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row, initialSuggestion]);

  if (!row) return null;

  const existingIds = new Set(components.map((component) => component.section_id));
  const pendingIds = new Set(newComponents.map((component) => component.section_id));
  // Once a suggestion has been queued (by name + run script path), drop it from
  // the suggestions list so it isn't offered again while it's already pending.
  // Compare against suggestedRunScriptPath(suggestion), not the raw comp_path,
  // since that's what draftFromSuggestion actually queued (C++ suggestions get
  // a /bin appended) - comparing against comp_path directly never matched them.
  const queuedSuggestionKeys = new Set(
    newComponents.map((component) => `${component.name}::${component.runScriptPath}`)
  );
  const visibleSuggestions = suggestions.filter(
    (suggestion) => !queuedSuggestionKeys.has(`${suggestion.component_name}::${suggestedRunScriptPath(suggestion)}`)
  );
  const usedIds = new Set([...existingIds, ...pendingIds]);
  if (editingSectionId) usedIds.delete(editingSectionId);
  const scheduleSiblings = scheduleSiblingsForName(draft.name, components, newComponents, editingSectionId);
  const previewSectionId = resolveSectionId(draft, usedIds, scheduleSiblings, editingSectionId);
  const scheduleConflict = findScheduleConflict(draft, scheduleSiblings);

  const runLifecycleAction = (action) => {
    setConfirmAction(null);
    setLifecycleAction(action);
    setLifecycleError(null);
    setLifecycleMessage(null);

    API.post(`/watcher-control/${action}`, { region: row.region, ip: row.ip })
      .then((response) => {
        setRunning(Boolean(response.data.running));
        setLifecycleMessage(response.data.message || `${LIFECYCLE_LABELS[action]} completed.`);
      })
      .catch((err) => {
        setLifecycleError(
          err.response?.data?.detail || err.response?.data?.error_message || `Failed to ${action} watcher.`
        );
      })
      .finally(() => setLifecycleAction(null));
  };

  const handleLifecycleClick = (action) => {
    if (action === "start") {
      runLifecycleAction("start");
      return;
    }
    if (confirmAction === action) {
      runLifecycleAction(action);
      return;
    }
    setConfirmAction(action);
  };

  const runRollback = () => {
    setConfirmAction(null);
    setRollingBack(true);
    setLifecycleError(null);
    setLifecycleMessage(null);
    setRollbackResult(null);

    API.post("/watcher-control/rollback", { region: row.region, ip: row.ip, restart: restartAfterApply })
      .then((response) => {
        const { restored = [], removed = [], changed = [], restarted, message } = response.data;
        setRollbackResult({ restored, removed, changed });
        setLifecycleMessage(message || "Rolled back to the previous config.ini.");
        if (restartAfterApply) setRunning(Boolean(restarted));
        // config.ini changed underneath us - refresh the components list and
        // whether a backup is still available (rolling back again would be a no-op).
        API.get("/watcher-control/fetch-components", { params: { region: row.region, ip: row.ip } })
          .then((res) => {
            setComponents(res.data.components || []);
            setHasBackup(Boolean(res.data.has_backup));
          })
          .catch(() => {});
        if (onApplied) onApplied(row);
      })
      .catch((err) => {
        setLifecycleError(
          err.response?.data?.detail || err.response?.data?.error_message || "Failed to roll back watcher configuration."
        );
      })
      .finally(() => setRollingBack(false));
  };

  const handleRollbackClick = () => {
    if (confirmAction === "rollback") {
      runRollback();
      return;
    }
    setConfirmAction("rollback");
  };

  const toggleRemoval = (sectionId) => {
    setPendingRemovals((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const startEdit = (component) => {
    setPendingRemovals((current) => {
      const next = new Set(current);
      if (editingSectionId && editingSectionId !== component.section_id) next.delete(editingSectionId);
      next.add(component.section_id);
      return next;
    });
    setEditingSectionId(component.section_id);
    setDraft(draftFromComponent(component));
    setDraftError(null);
    setShowAddForm(true);
    // Wait a tick for the form to actually expand before scrolling, otherwise
    // this scrolls against the still-collapsed layout.
    window.setTimeout(() => {
      addComponentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const cancelEdit = () => {
    if (editingSectionId) {
      setPendingRemovals((current) => {
        const next = new Set(current);
        next.delete(editingSectionId);
        return next;
      });
    }
    setEditingSectionId(null);
    setDraft(EMPTY_DRAFT);
    setDraftError(null);
  };

  const revertRow = (component) => {
    if (editingSectionId === component.section_id) {
      cancelEdit();
    } else {
      toggleRemoval(component.section_id);
    }
  };

  const toggleDraftDay = (dayValue) => {
    setDraft((current) => {
      const has = current.runningDates.includes(dayValue);
      return {
        ...current,
        runningDates: has
          ? current.runningDates.filter((day) => day !== dayValue)
          : [...current.runningDates, dayValue].sort((a, b) => a - b),
      };
    });
  };

  const applySuggestion = (suggestion) => {
    if (editingSectionId) {
      setPendingRemovals((current) => {
        const next = new Set(current);
        next.delete(editingSectionId);
        return next;
      });
      setEditingSectionId(null);
    }
    setDraft(draftFromSuggestion(suggestion));
    setDraftError(null);
    setShowAddForm(true);

    // Wait a tick for the form to actually expand before scrolling, otherwise
    // this scrolls against the still-collapsed layout.
    window.setTimeout(() => {
      addComponentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const addDraftToQueue = () => {
    const sectionId = previewSectionId;
    const validationError = draftValidationError(draft, sectionId);
    if (validationError) {
      setDraftError(validationError);
      return;
    }
    if (scheduleConflict) {
      setDraftError(scheduleConflict);
      return;
    }
    setNewComponents((current) => [
      ...current,
      {
        ...draft,
        section_id: sectionId,
        port: draft.port === "" ? null : Number(draft.port),
        maxUpDays: Number(draft.maxUpDays) || 1,
      },
    ]);
    setDraft(EMPTY_DRAFT);
    setDraftError(null);
    setEditingSectionId(null);
  };

  const copySettingsFromSibling = (sibling) => {
    setDraft((current) => ({
      ...current,
      tag: sibling.tag || "",
      port: sibling.port !== null && sibling.port !== undefined && sibling.port !== "" ? String(sibling.port) : "",
      maxUpDays: sibling.maxUpDays,
      needToUp: sibling.needToUp,
      needToSendMail: sibling.needToSendMail,
      runScriptPath: sibling.runScriptPath || "",
      runScript: sibling.runScript || "run.sh",
      logDirectory: sibling.logDirectory || "",
    }));
  };

  const removeDraftFromQueue = (sectionId) => {
    setNewComponents((current) => current.filter((component) => component.section_id !== sectionId));
  };

  const hasChanges = !editingSectionId && (pendingRemovals.size > 0 || newComponents.length > 0);

  const applyChanges = () => {
    if (!hasChanges) return;
    setShowSuggestions(false);
    setShowAddForm(false);
    setSubmitting(true);
    setError(null);
    setResultMessage(null);

    API.post("/watcher-control/configure", {
      region: row.region,
      ip: row.ip,
      add_components: newComponents,
      remove_component_ids: [...pendingRemovals],
      restart: restartAfterApply,
    })
      .then((response) => {
        const restarted = Boolean(response.data.restarted);
        const restartRequestedButFailed = restartAfterApply && !restarted;
        setResultMessage(
          response.data.message ||
            (restartRequestedButFailed
              ? "Configuration applied, but the watcher failed to restart — restart it manually."
              : "Configuration applied.")
        );
        setResultSeverity(restartRequestedButFailed ? "warning" : "success");
        setComponents((current) =>
          current
            .filter((component) => !pendingRemovals.has(component.section_id))
            .concat(newComponents.map((component) => ({ ...component })))
        );
        setPendingRemovals(new Set());
        setNewComponents([]);
        setEditingSectionId(null);
        if (restartAfterApply) setRunning(restarted);
        if (onApplied) onApplied(row);
      })
      .catch((err) => {
        setError(
          err.response?.data?.detail || err.response?.data?.error_message || "Failed to apply watcher configuration."
        );
      })
      .finally(() => setSubmitting(false));
  };

  const busy = submitting || Boolean(lifecycleAction) || rollingBack;
  const runningConfig = getWatcherRunningConfig({ apiUnreachable, running, loading: statusLoading });

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: "linear-gradient(180deg, rgba(10,18,31,0.98) 0%, rgba(15,23,42,0.98) 100%)",
          color: "white",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <TuneIcon sx={{ color: "#FF6B35" }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Watcher Actions
          </Typography>
          {row.hostname ? (
            <Chip
              label={row.hostname}
              size="small"
              sx={{ bgcolor: "rgba(148, 163, 184, 0.16)", color: "#CBD5E1", fontWeight: 600 }}
            />
          ) : null}
          <Chip
            label={row.ip}
            size="small"
            sx={{
              bgcolor: "rgba(148, 163, 184, 0.16)",
              color: "#CBD5E1",
              fontFamily: "monospace",
              fontWeight: 600,
            }}
          />
          <StatusChip label={runningConfig.label} color={runningConfig.color} Icon={runningConfig.Icon} />
        </Box>
        <IconButton onClick={busy ? undefined : onClose} sx={tintedIconButtonSx("#94A3B8")}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {apiUnreachable ? (
          <Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || `Could not reach the watcher API on ${row.ip}.`}
            </Alert>
            <Paper
              variant="outlined"
              sx={{ p: 2.5, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Start the watcher API on {row.ip}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mb: 2 }}>
                This dashboard talks to a small control API that runs alongside the watcher on the host
                itself. It isn&apos;t reachable right now, so nothing here can be shown or changed until it&apos;s
                back up.
              </Typography>
              <Stack spacing={1.25} component="ol" sx={{ pl: 3, m: 0 }}>
                <Typography component="li" variant="body2">
                  SSH into the host:{" "}
                  <Box component="span" sx={{ fontFamily: "monospace", color: theme.palette.primary.light }}>
                    ssh &lt;user&gt;@{row.ip}
                  </Box>
                </Typography>
                <Typography component="li" variant="body2">
                  Go to the watcher&apos;s directory (commonly{" "}
                  <Box component="span" sx={{ fontFamily: "monospace", color: theme.palette.primary.light }}>
                    /apps/all_in_one_watcher
                  </Box>
                  , but it varies by host).
                </Typography>
                <Typography component="li" variant="body2">
                  Start just the control API:{" "}
                  <Box component="span" sx={{ fontFamily: "monospace", color: theme.palette.primary.light }}>
                    ./run_api.sh
                  </Box>{" "}
                  — or{" "}
                  <Box component="span" sx={{ fontFamily: "monospace", color: theme.palette.primary.light }}>
                    ./run.sh
                  </Box>{" "}
                  to bring up both the watcher and its API together.
                </Typography>
                <Typography component="li" variant="body2">
                  Click Retry below once it&apos;s up.
                </Typography>
              </Stack>
              <Box sx={{ mt: 2.5, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  onClick={loadModalData}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
                  sx={{ color: "white", borderColor: "rgba(255,255,255,0.4)" }}
                >
                  {loading ? "Retrying..." : "Retry"}
                </Button>
              </Box>
            </Paper>
          </Box>
        ) : (
          <>
        <Paper
          variant="outlined"
          sx={{ p: 2, mt: 1, mb: 3, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}
        >
          {lifecycleError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {lifecycleError}
            </Alert>
          ) : null}
          {lifecycleMessage ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              {lifecycleMessage}
            </Alert>
          ) : null}

          {rollbackResult ? (
            <Box sx={{ mb: 2 }}>
              {rollbackResult.restored.length === 0 &&
              rollbackResult.removed.length === 0 &&
              rollbackResult.changed.length === 0 ? (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                  Nothing to undo — config.ini already matched the backup.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {rollbackResult.restored.length > 0 ? (
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="caption" sx={{ color: theme.palette.success.light, minWidth: 90 }}>
                        Restored:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {rollbackResult.restored.map((sectionId) => (
                          <Chip key={sectionId} label={sectionId} size="small" color="success" variant="outlined" sx={{ fontFamily: "monospace" }} />
                        ))}
                      </Stack>
                    </Box>
                  ) : null}
                  {rollbackResult.removed.length > 0 ? (
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="caption" sx={{ color: "#F87171", minWidth: 90 }}>
                        Removed:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {rollbackResult.removed.map((sectionId) => (
                          <Chip key={sectionId} label={sectionId} size="small" color="error" variant="outlined" sx={{ fontFamily: "monospace" }} />
                        ))}
                      </Stack>
                    </Box>
                  ) : null}
                  {rollbackResult.changed.length > 0 ? (
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="caption" sx={{ color: theme.palette.warning.light, minWidth: 90 }}>
                        Reverted:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {rollbackResult.changed.map((sectionId) => (
                          <Chip key={sectionId} label={sectionId} size="small" color="warning" variant="outlined" sx={{ fontFamily: "monospace" }} />
                        ))}
                      </Stack>
                    </Box>
                  ) : null}
                </Stack>
              )}
            </Box>
          ) : null}

          {confirmAction ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography variant="body2">
                {confirmAction === "stop"
                  ? "Stop the watcher and disable auto-restart until it's started again?"
                  : confirmAction === "restart"
                  ? "Restart the watcher now? Components it manages will briefly be unsupervised."
                  : "Roll back config.ini to the backup taken before the last change? This undoes it."}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" onClick={() => setConfirmAction(null)} sx={{ color: "rgba(255,255,255,0.8)" }}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color={confirmAction === "stop" ? "error" : confirmAction === "rollback" ? "secondary" : "warning"}
                  onClick={() => (confirmAction === "rollback" ? runRollback() : runLifecycleAction(confirmAction))}
                >
                  {confirmAction === "rollback" ? "Confirm Rollback" : `Confirm ${LIFECYCLE_LABELS[confirmAction]}`}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                color="success"
                startIcon={
                  lifecycleAction === "start" ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />
                }
                disabled={busy || running === true}
                onClick={() => handleLifecycleClick("start")}
              >
                Start
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={lifecycleAction === "stop" ? <CircularProgress size={14} color="inherit" /> : <StopIcon />}
                disabled={busy || running === false}
                onClick={() => handleLifecycleClick("stop")}
              >
                Stop
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={
                  lifecycleAction === "restart" ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <RestartAltIcon />
                  )
                }
                disabled={busy}
                onClick={() => handleLifecycleClick("restart")}
              >
                Restart
              </Button>
              <Tooltip title={hasBackup ? "" : "No backup available yet — apply a configuration change first."}>
                <span>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={rollingBack ? <CircularProgress size={14} color="inherit" /> : <HistoryIcon />}
                    disabled={busy || !hasBackup}
                    onClick={handleRollbackClick}
                  >
                    Rollback
                  </Button>
                </span>
              </Tooltip>
            </Box>
          )}
        </Paper>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        {resultMessage ? (
          <Alert severity={resultSeverity} sx={{ mb: 2 }}>
            {resultMessage}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.text.primary, 0.04),
                borderColor: theme.palette.divider,
                overflow: "hidden",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Current components ({components.length})
              </Typography>
              {components.length === 0 ? (
                <Typography variant="body2" color="rgba(255,255,255,0.6)">
                  No components configured on this watcher.
                </Typography>
              ) : (
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Section</TableCell>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Tag</TableCell>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Schedule</TableCell>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Run Script</TableCell>
                        <TableCell align="right" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {components.map((component, index) => {
                        const marked = pendingRemovals.has(component.section_id);
                        const isEditing = editingSectionId === component.section_id;
                        const tagPalette = paletteForString(component.tag, tagColorPalette);
                        const runScriptFullPath = component.runScriptPath
                          ? `${component.runScriptPath}/${component.runScript || ""}`
                          : "N/A";
                        return (
                          <TableRow
                            key={component.section_id}
                            sx={{
                              opacity: marked && !isEditing ? 0.45 : 1,
                              textDecoration: marked && !isEditing ? "line-through" : "none",
                              bgcolor: isEditing
                                ? alpha(theme.palette.warning.main, 0.1)
                                : index % 2 === 1
                                ? "rgba(255,255,255,0.02)"
                                : "transparent",
                              "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                            }}
                          >
                            <TableCell>
                              <Chip
                                label={component.section_id}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontFamily: "monospace",
                                  color: isEditing ? theme.palette.warning.light : theme.palette.text.secondary,
                                  borderColor: isEditing ? theme.palette.warning.main : theme.palette.divider,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: "white", fontWeight: 600 }}>{component.name || "N/A"}</TableCell>
                            <TableCell>
                              {component.tag ? (
                                <Chip
                                  label={component.tag}
                                  size="small"
                                  sx={{
                                    bgcolor: tagPalette.bg,
                                    color: tagPalette.color,
                                    border: `1px solid ${tagPalette.border}`,
                                  }}
                                />
                              ) : (
                                <Typography variant="body2" color="rgba(255,255,255,0.4)">
                                  N/A
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <ScheduleChips
                                days={parseRunningDates(component.runningDates)}
                                startTime={component.startTime}
                                endTime={component.endTime}
                              />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 220 }}>
                              <Tooltip title={runScriptFullPath}>
                                <Typography
                                  variant="body2"
                                  noWrap
                                  sx={{ color: "rgba(255,255,255,0.8)", fontFamily: "monospace" }}
                                >
                                  {runScriptFullPath}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                              {marked || isEditing ? (
                                <IconButton
                                  size="small"
                                  onClick={() => revertRow(component)}
                                  sx={tintedIconButtonSx("#60A5FA")}
                                  title={isEditing ? "Cancel edit" : "Undo removal"}
                                >
                                  <RestoreIcon fontSize="small" />
                                </IconButton>
                              ) : (
                                <>
                                  <IconButton
                                    size="small"
                                    onClick={() => startEdit(component)}
                                    sx={tintedIconButtonSx("#60A5FA")}
                                    title="Edit"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => toggleRemoval(component.section_id)}
                                    sx={tintedIconButtonSx("#E24B4A")}
                                    title="Mark for removal"
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>

            <Paper
              variant="outlined"
              sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.08), borderColor: alpha(theme.palette.primary.main, 0.3) }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: showSuggestions ? 1.5 : 0,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Suggested components {suggestionsLoading ? "" : `(${visibleSuggestions.length})`}
                </Typography>
                <Button
                  size="small"
                  startIcon={showSuggestions ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  onClick={() => setShowSuggestions((current) => !current)}
                  sx={{ color: "rgba(255,255,255,0.8)" }}
                >
                  {showSuggestions ? "Hide" : "Show"}
                </Button>
              </Box>
              {showSuggestions ? (
                <>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", mb: 1.5 }}>
                    Found on this host by the component collector but not yet configured in the watcher. Picking
                    one pre-fills the form below with a 24×7 schedule — review and edit before adding.
                  </Typography>
                  {suggestionsLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                      <CircularProgress size={20} />
                    </Box>
                  ) : visibleSuggestions.length === 0 ? (
                    <Typography variant="body2" color="rgba(255,255,255,0.6)">
                      {suggestions.length === 0
                        ? "Nothing to suggest — every discovered component is already configured."
                        : "All discovered components are already queued below."}
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {visibleSuggestions.map((suggestion, index) => {
                        const { tag: suggestedTag, port: suggestedPort } = suggestedTagPort(suggestion);
                        return (
                        <Box
                          key={`${suggestion.component_name}-${suggestion.comp_path}-${index}`}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {suggestion.component_name || "N/A"}
                              {suggestion.platform ? (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{ ml: 1, color: "rgba(255,255,255,0.6)" }}
                                >
                                  {suggestion.platform}
                                </Typography>
                              ) : null}
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: "monospace", color: "rgba(255,255,255,0.6)" }}>
                              {suggestion.comp_path || "N/A"}
                            </Typography>
                            {suggestedTag || suggestedPort ? (
                              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                {suggestedTag ? (
                                  <Chip label={`tag: ${suggestedTag}`} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                                ) : null}
                                {suggestedPort ? (
                                  <Chip label={`port: ${suggestedPort}`} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                                ) : null}
                              </Stack>
                            ) : null}
                          </Box>
                          <Button
                            size="small"
                            startIcon={<PlaylistAddIcon fontSize="small" />}
                            onClick={() => applySuggestion(suggestion)}
                            sx={{ color: "#93C5FD" }}
                          >
                            Use this
                          </Button>
                        </Box>
                        );
                      })}
                    </Stack>
                  )}
                </>
              ) : null}
            </Paper>

            {newComponents.length > 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.secondary.main, 0.08),
                  borderColor: alpha(theme.palette.secondary.main, 0.3),
                  overflow: "hidden",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Components to add ({newComponents.length})
                </Typography>
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Section</TableCell>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Tag</TableCell>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Port</TableCell>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Schedule</TableCell>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Run Script</TableCell>
                        <TableCell align="right" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {newComponents.map((component, index) => {
                        const tagPalette = paletteForString(component.tag, tagColorPalette);
                        const runScriptFullPath = component.runScriptPath
                          ? `${component.runScriptPath}/${component.runScript || ""}`
                          : "N/A";
                        return (
                          <TableRow
                            key={component.section_id}
                            sx={{
                              bgcolor: index % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent",
                              "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                            }}
                          >
                            <TableCell>
                              <Chip
                                label={component.section_id}
                                size="small"
                                variant="outlined"
                                sx={{ fontFamily: "monospace", color: theme.palette.text.secondary, borderColor: theme.palette.divider }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: "white", fontWeight: 600 }}>{component.name || "N/A"}</TableCell>
                            <TableCell>
                              {component.tag ? (
                                <Chip
                                  label={component.tag}
                                  size="small"
                                  sx={{
                                    bgcolor: tagPalette.bg,
                                    color: tagPalette.color,
                                    border: `1px solid ${tagPalette.border}`,
                                  }}
                                />
                              ) : (
                                <Typography variant="body2" color="rgba(255,255,255,0.4)">
                                  N/A
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ color: "rgba(255,255,255,0.8)" }}>
                              {component.port !== null && component.port !== undefined ? component.port : "N/A"}
                            </TableCell>
                            <TableCell>
                              <ScheduleChips
                                days={component.runningDates}
                                startTime={component.startTime}
                                endTime={component.endTime}
                              />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 220 }}>
                              <Tooltip title={runScriptFullPath}>
                                <Typography
                                  variant="body2"
                                  noWrap
                                  sx={{ color: "rgba(255,255,255,0.8)", fontFamily: "monospace" }}
                                >
                                  {runScriptFullPath}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => removeDraftFromQueue(component.section_id)}
                                sx={tintedIconButtonSx("#E24B4A")}
                                title="Remove from queue"
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ) : null}

            <Paper
              ref={addComponentSectionRef}
              variant="outlined"
              sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: showAddForm ? 1.5 : 0,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {editingSectionId ? `Editing ${editingSectionId}` : "Add a new component"}
                </Typography>
                {editingSectionId ? (
                  <Button size="small" onClick={cancelEdit} sx={{ color: "rgba(255,255,255,0.8)" }}>
                    Cancel edit
                  </Button>
                ) : (
                  <Button
                    size="small"
                    startIcon={
                      showAddForm ? <ExpandLessIcon fontSize="small" /> : <AddCircleOutlineIcon fontSize="small" />
                    }
                    onClick={() => setShowAddForm((current) => !current)}
                    sx={{ color: "rgba(255,255,255,0.8)" }}
                  >
                    {showAddForm ? "Hide" : "Add new component"}
                  </Button>
                )}
              </Box>
              {showAddForm ? (
                <>
              {draftError ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {draftError}
                </Alert>
              ) : null}
              {scheduleSiblings.length > 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                    <Typography variant="body2">
                      {editingSectionId
                        ? `"${draft.name}" has other schedule windows below - this edit is checked against them.`
                        : `"${draft.name}" already has a schedule - this will be added as another window (${previewSectionId}). Its tag/port/run script settings must match exactly; only the time and days may differ.`}
                    </Typography>
                    {!editingSectionId ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => copySettingsFromSibling(scheduleSiblings[0])}
                        sx={{ color: "white", borderColor: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}
                      >
                        Copy settings from {scheduleSiblings[0].sectionId}
                      </Button>
                    ) : null}
                  </Box>
                  <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                    {scheduleSiblings.map((sibling) => (
                      <Box key={sibling.sectionId} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Chip
                          label={sibling.sectionId}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: "monospace", fontSize: 11 }}
                        />
                        <ScheduleChips days={sibling.runningDates} startTime={sibling.startTime} endTime={sibling.endTime} />
                      </Box>
                    ))}
                  </Stack>
                </Alert>
              ) : null}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Name"
                  size="small"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  helperText={previewSectionId ? `Section ID: ${previewSectionId}` : "Section ID is generated from the name"}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                  sx={{ input: { color: "white" }, "& .MuiFormHelperText-root": { color: "rgba(147,197,253,0.85)", fontFamily: "monospace" } }}
                />
                <TextField
                  label="Tag"
                  size="small"
                  value={draft.tag}
                  onChange={(event) => setDraft({ ...draft, tag: event.target.value })}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                  sx={{ input: { color: "white" } }}
                />
                <TextField
                  label="Port (optional)"
                  size="small"
                  type="number"
                  value={draft.port}
                  onChange={(event) => setDraft({ ...draft, port: event.target.value })}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                  sx={{ input: { color: "white" } }}
                />
                <TextField
                  label="Start Time (HH:MM:SS)"
                  size="small"
                  value={draft.startTime}
                  onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                  sx={{ input: { color: "white" } }}
                />
                <TextField
                  label="End Time (HH:MM:SS)"
                  size="small"
                  value={draft.endTime}
                  onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                  sx={{ input: { color: "white" } }}
                />
                <TextField
                  label="Max Up Days"
                  size="small"
                  type="number"
                  value={draft.maxUpDays}
                  onChange={(event) => setDraft({ ...draft, maxUpDays: event.target.value })}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                  sx={{ input: { color: "white" } }}
                />
                <TextField
                  label="Run Script Path"
                  size="small"
                  value={draft.runScriptPath}
                  onChange={(event) => setDraft({ ...draft, runScriptPath: event.target.value })}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                  sx={{ input: { color: "white" }, gridColumn: { md: "span 2" } }}
                />
                <TextField
                  label="Run Script"
                  size="small"
                  value={draft.runScript}
                  onChange={(event) => setDraft({ ...draft, runScript: event.target.value })}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                  sx={{ input: { color: "white" } }}
                />
                <TextField
                  label="Log Directory (optional)"
                  size="small"
                  value={draft.logDirectory}
                  onChange={(event) => setDraft({ ...draft, logDirectory: event.target.value })}
                  InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
                  sx={{ input: { color: "white" }, gridColumn: { md: "span 2" } }}
                />
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                  Running Days
                </Typography>
                <FormGroup row>
                  {DAY_OPTIONS.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      control={
                        <Checkbox
                          size="small"
                          checked={draft.runningDates.includes(option.value)}
                          onChange={() => toggleDraftDay(option.value)}
                          sx={{ color: "rgba(255,255,255,0.5)" }}
                        />
                      }
                      label={option.label}
                    />
                  ))}
                </FormGroup>
              </Box>

              <Box sx={{ mt: 1, display: "flex", gap: 3, flexWrap: "wrap" }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={draft.needToUp}
                      onChange={(event) => setDraft({ ...draft, needToUp: event.target.checked })}
                    />
                  }
                  label="Auto-restart if down"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={draft.needToSendMail}
                      onChange={(event) => setDraft({ ...draft, needToSendMail: event.target.checked })}
                    />
                  }
                  label="Send email notifications"
                />
              </Box>

              <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  startIcon={<AddCircleOutlineIcon />}
                  variant="outlined"
                  onClick={addDraftToQueue}
                  sx={{ color: "white", borderColor: "rgba(255,255,255,0.4)" }}
                >
                  {editingSectionId ? "Update Component" : "Queue Component"}
                </Button>
              </Box>
                </>
              ) : null}
            </Paper>
          </Stack>
        )}
          </>
        )}
      </DialogContent>

      <Divider sx={{ borderColor: theme.palette.divider }} />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: apiUnreachable ? "flex-end" : "space-between" }}>
        {apiUnreachable ? (
          <Button onClick={onClose} sx={{ color: "rgba(255,255,255,0.8)" }}>
            Close
          </Button>
        ) : (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={restartAfterApply}
                  onChange={(event) => setRestartAfterApply(event.target.checked)}
                />
              }
              label="Restart watcher after applying"
            />
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button onClick={onClose} disabled={busy} sx={{ color: "rgba(255,255,255,0.8)" }}>
                Close
              </Button>
              <Button
                variant="contained"
                color="primary"
                disabled={!hasChanges || busy}
                onClick={applyChanges}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {submitting
                  ? "Applying..."
                  : `Apply Changes${hasChanges ? ` (${pendingRemovals.size + newComponents.length})` : ""}`}
              </Button>
            </Box>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

WatcherActionsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  row: PropTypes.shape({
    region: PropTypes.string,
    ip: PropTypes.string,
    hostname: PropTypes.string,
  }),
  initialSuggestion: PropTypes.shape({
    component_name: PropTypes.string,
    comp_path: PropTypes.string,
    platform: PropTypes.string,
    tag: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  onClose: PropTypes.func.isRequired,
  onApplied: PropTypes.func,
};

WatcherActionsModal.defaultProps = {
  row: null,
  initialSuggestion: null,
  onApplied: null,
};

export default WatcherActionsModal;
