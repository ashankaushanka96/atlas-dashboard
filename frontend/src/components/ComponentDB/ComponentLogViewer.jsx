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
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DownloadIcon from "@mui/icons-material/Download";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import authService, { API } from "../../services/auth";
import { wsBackend } from "../../config/config.js";

const TAIL_LINE_OPTIONS = [50, 100, 200, 500, 1000, 2000];
const PAGE_LINE_OPTIONS = [100, 200, 500, 1000];
const MAX_LIVE_LINES = 5000;

// Regex mode compiles each pattern as a real regular expression (JS RegExp
// in Tail/live-tail, Python re in Less) - both cover the same ground as
// egrep's extended syntax: alternation, character classes, quantifiers,
// anchors, groups. The one thing egrep users tend to reach for that neither
// supports is POSIX bracket classes like [[:alpha:]] - use \w / [a-zA-Z]
// instead.
const REGEX_CHEATSHEET = [
  { pattern: "foo|bar", meaning: "foo OR bar (egrep -E alternation)" },
  { pattern: "^ERROR", meaning: "line starts with ERROR" },
  { pattern: "timeout$", meaning: "line ends with timeout" },
  { pattern: "SEQ=\\d+", meaning: "SEQ= followed by one or more digits" },
  { pattern: "SEQ=1[0-9]{3}", meaning: "SEQ=1000 through SEQ=1999" },
  { pattern: "WARN|ERROR|FATAL", meaning: "any of these three levels" },
  { pattern: "user_\\w+", meaning: "user_ followed by letters/digits/_" },
  { pattern: "fail(ed|ure)?", meaning: "fail, failed, or failure" },
  { pattern: "\\bID\\b", meaning: "the whole word ID, not e.g. VALID" },
  { pattern: ".", meaning: "any single character (escape as \\. for a literal dot)" },
];

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "?";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// Compiles each pattern once (not per line) into a small test function, so
// filtering a batch of lines - a tail window, or a chunk of live-tail
// pushes - stays cheap even at a couple thousand lines.
function buildPatternTesters(patterns, useRegex, ignoreCase) {
  return (patterns || []).filter(Boolean).map((pattern) => {
    if (useRegex) {
      try {
        const re = new RegExp(pattern, ignoreCase ? "i" : "");
        return (line) => re.test(line);
      } catch {
        return () => false;
      }
    }
    const needle = ignoreCase ? pattern.toLowerCase() : pattern;
    return (line) => (ignoreCase ? line.toLowerCase() : line).includes(needle);
  });
}

// tail | grep equivalent, applied client-side since a tail window (or a
// live-tail push) is already small. A line must match every pattern - same
// AND-chain semantics as the server-side grep mode.
function filterLines(lines, patterns, useRegex, ignoreCase) {
  const testers = buildPatternTesters(patterns, useRegex, ignoreCase);
  if (testers.length === 0) return lines;
  return lines.filter((line) => testers.every((test) => test(line)));
}

// Mirrors the backend's own naming for a grep-filtered download, so the
// file the browser saves matches what the server actually sent.
function buildFilteredFilename(fileName) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return `${fileName}.filtered`;
  return `${fileName.slice(0, dotIndex)}.filtered${fileName.slice(dotIndex)}`;
}

function formatModified(epochSeconds) {
  if (!epochSeconds) return "";
  return new Date(epochSeconds * 1000).toLocaleString();
}

// Highlights every match of any active grep pattern inside a line (a
// displayed line already satisfies all of them - AND semantics - this just
// shows where each one hit). Falls back to the plain line on an invalid regex.
function highlightMatches(text, patterns, useRegex, ignoreCase) {
  const active = (patterns || []).filter(Boolean);
  if (active.length === 0) return text;
  let regex;
  try {
    const flags = ignoreCase ? "gi" : "g";
    const sources = active.map((pattern) => (useRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    regex = new RegExp(`(?:${sources.join("|")})`, flags);
  } catch {
    return text;
  }

  const parts = [];
  let lastIndex = 0;
  let match = regex.exec(text);
  let key = 0;
  while (match !== null) {
    if (match[0] === "") {
      regex.lastIndex += 1;
      match = regex.exec(text);
      continue;
    }
    parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <Box
        key={key}
        component="mark"
        sx={{ bgcolor: "rgba(250, 204, 21, 0.35)", color: "inherit", borderRadius: 0.5, px: "1px" }}
      >
        {match[0]}
      </Box>
    );
    key += 1;
    lastIndex = match.index + match[0].length;
    match = regex.exec(text);
  }
  parts.push(text.slice(lastIndex));
  return parts;
}

function ComponentLogViewer({ target, canDownload }) {
  const theme = useTheme();
  const contentRef = useRef(null);
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [regexHelpAnchor, setRegexHelpAnchor] = useState(null);

  const [logFiles, setLogFiles] = useState([]);
  const [logFilesLoading, setLogFilesLoading] = useState(false);
  const [logFilesError, setLogFilesError] = useState(null);
  const [selectedFile, setSelectedFile] = useState("");

  const [mode, setMode] = useState("tail");
  const [wrapLines, setWrapLines] = useState(false);

  const [tailLines, setTailLines] = useState(200);
  const [liveTail, setLiveTail] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const wsRef = useRef(null);
  const wsRetryRef = useRef(0);
  const wsReconnectTimerRef = useRef(null);

  const [pageLines, setPageLines] = useState(200);
  const [pageOffset, setPageOffset] = useState(0);
  const [pageHistory, setPageHistory] = useState([]);

  // grepPatterns is a chain: each entry narrows the previous results, same
  // as `grep a | grep b | grep c` - every pattern must match (AND).
  const [grepPatterns, setGrepPatterns] = useState([]);
  const [grepInput, setGrepInput] = useState("");
  const [grepRegex, setGrepRegex] = useState(false);
  const [grepIgnoreCase, setGrepIgnoreCase] = useState(true);
  const [grepOffset, setGrepOffset] = useState(0);
  const [grepHistory, setGrepHistory] = useState([]);

  const [lines, setLines] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState(null);
  const [eof, setEof] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [totalSize, setTotalSize] = useState(null);
  const [scanTruncated, setScanTruncated] = useState(false);

  useEffect(() => {
    if (!target) return;
    setLogFilesLoading(true);
    setLogFilesError(null);
    API.get("/watcher-control/component/logs", {
      params: { region: target.region, ip: target.ip, tag: target.tag },
    })
      .then((response) => {
        const files = response.data.files || [];
        setLogFiles(files);
        if (files.length > 0) setSelectedFile(files[0].name);
      })
      .catch((err) => {
        setLogFilesError(
          err.response?.data?.detail || err.response?.data?.error_message || "Failed to list log files."
        );
        setLogFiles([]);
      })
      .finally(() => setLogFilesLoading(false));
  }, [target]);

  const loadTail = (patternsOverride) => {
    if (!target || !selectedFile) return;
    const activePatterns = patternsOverride !== undefined ? patternsOverride : grepPatterns;
    setContentLoading(true);
    setContentError(null);
    API.get("/watcher-control/component/logs/tail", {
      params: { region: target.region, ip: target.ip, tag: target.tag, file: selectedFile, lines: tailLines },
    })
      .then((response) => {
        setLines(filterLines(response.data.lines || [], activePatterns, grepRegex, grepIgnoreCase));
        setTotalSize(response.data.total_size ?? null);
        setEof(true);
      })
      .catch((err) => {
        setContentError(err.response?.data?.detail || err.response?.data?.error_message || "Failed to read log.");
      })
      .finally(() => setContentLoading(false));
  };

  const loadPage = (offset) => {
    if (!target || !selectedFile) return;
    setContentLoading(true);
    setContentError(null);
    API.get("/watcher-control/component/logs/page", {
      params: { region: target.region, ip: target.ip, tag: target.tag, file: selectedFile, offset, lines: pageLines },
    })
      .then((response) => {
        setLines(response.data.lines || []);
        setNextOffset(response.data.next_offset ?? offset);
        setTotalSize(response.data.total_size ?? null);
        setEof(Boolean(response.data.eof));
        setPageOffset(offset);
      })
      .catch((err) => {
        setContentError(err.response?.data?.detail || err.response?.data?.error_message || "Failed to read log.");
      })
      .finally(() => setContentLoading(false));
  };

  const loadGrep = (offset, resetHistory, patternsOverride) => {
    const activePatterns = patternsOverride || grepPatterns;
    if (!target || !selectedFile || activePatterns.length === 0) return;
    setContentLoading(true);
    setContentError(null);

    // Built manually (not via axios `params`) so repeated pattern keys come
    // through as `pattern=a&pattern=b`, matching what the backend expects
    // for a chained grep - axios's array serialization isn't guaranteed to
    // match that shape.
    const query = new URLSearchParams();
    query.set("region", target.region);
    query.set("ip", target.ip);
    query.set("tag", target.tag);
    query.set("file", selectedFile);
    activePatterns.forEach((pattern) => query.append("pattern", pattern));
    query.set("offset", offset);
    query.set("lines", pageLines);
    query.set("ignore_case", grepIgnoreCase);
    query.set("regex", grepRegex);

    API.get(`/watcher-control/component/logs/grep?${query.toString()}`)
      .then((response) => {
        setLines(response.data.lines || []);
        setNextOffset(response.data.next_offset ?? offset);
        setTotalSize(response.data.total_size ?? null);
        setEof(Boolean(response.data.eof));
        setScanTruncated(Boolean(response.data.scan_truncated));
        setGrepOffset(offset);
        if (resetHistory) setGrepHistory([]);
      })
      .catch((err) => {
        setContentError(
          err.response?.data?.detail || err.response?.data?.error_message || "Failed to search log."
        );
      })
      .finally(() => setContentLoading(false));
  };

  // A different file is a different investigation - drop any grep chain
  // built up against the previous one.
  useEffect(() => {
    setGrepPatterns([]);
    setGrepInput("");
  }, [selectedFile]);

  // Switching file or mode starts that mode fresh (grep waits for a pattern).
  // Leaving Tail mode also turns Live tail off - it's a tail-only concept,
  // and turning it off here (not just relying on the WS effect's mode
  // guard) means it never silently keeps running, or silently resumes if
  // you switch back to Tail later without re-enabling it yourself.
  useEffect(() => {
    if (!selectedFile) return;
    setLines([]);
    setContentError(null);
    setScanTruncated(false);
    setPageHistory([]);
    setGrepHistory([]);
    if (mode === "tail") {
      loadTail();
    } else {
      setLiveTail(false);
      if (mode === "page") {
        if (grepPatterns.length > 0) loadGrep(0, true);
        else loadPage(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, mode]);

  // Auto-scroll to the bottom on every tail refresh.
  useEffect(() => {
    if (mode === "tail" && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [lines, mode]);

  // Real-time tail -f over a WebSocket: the backend seeds with the current
  // tail, then pushes only newly-appended lines roughly once a second (see
  // ws_tail_component_log on the backend). Reconnects with capped backoff
  // if the connection drops while this is still toggled on.
  useEffect(() => {
    if (!liveTail || mode !== "tail" || !target || !selectedFile) return undefined;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const token = authService.getAccessToken();
      const params = new URLSearchParams({
        region: target.region,
        ip: target.ip,
        tag: target.tag,
        file: selectedFile,
        lines: String(tailLines),
      });
      if (token) params.set("token", token);

      const socket = new WebSocket(`${wsBackend}/watcher-control/component/logs/ws-tail?${params.toString()}`);
      wsRef.current = socket;

      socket.onopen = () => {
        wsRetryRef.current = 0;
        setLiveConnected(true);
        setContentError(null);
      };

      socket.onmessage = (event) => {
        // Defensive: ignore anything that arrives after this effect has
        // already been cleaned up (e.g. mode/file switched away), in case
        // a message was already in flight when close() was called.
        if (cancelled) return;
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.type === "seed") {
          setLines(filterLines(msg.lines || [], grepPatterns, grepRegex, grepIgnoreCase));
        } else if (msg.type === "log_lines" && msg.lines?.length) {
          const filtered = filterLines(msg.lines, grepPatterns, grepRegex, grepIgnoreCase);
          if (filtered.length === 0) return;
          setLines((current) => {
            const next = [...current, ...filtered];
            return next.length > MAX_LIVE_LINES ? next.slice(next.length - MAX_LIVE_LINES) : next;
          });
        } else if (msg.type === "error") {
          setContentError(msg.detail || "Live tail error.");
        }
      };

      socket.onclose = () => {
        setLiveConnected(false);
        wsRef.current = null;
        if (cancelled) return;
        const delay = Math.min(10000, 500 * 2 ** wsRetryRef.current);
        wsRetryRef.current += 1;
        wsReconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(wsReconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      setLiveConnected(false);
    };
    // Reconnecting on filter change means the seed (and everything shown)
    // gets re-filtered from scratch, rather than mixing old and new filters
    // in the same accumulated view.
  }, [liveTail, mode, selectedFile, target, tailLines, grepPatterns, grepRegex, grepIgnoreCase]);

  const handlePageStart = () => {
    setPageHistory([]);
    loadPage(0);
  };
  const handlePageNext = () => {
    setPageHistory((current) => [...current, pageOffset]);
    loadPage(nextOffset);
  };
  const handlePagePrev = () => {
    setPageHistory((current) => {
      if (current.length === 0) return current;
      loadPage(current[current.length - 1]);
      return current.slice(0, -1);
    });
  };

  // Adding a keyword appends it to the chain - each addition narrows the
  // previous results further, the same as piping into another `grep`. In
  // grep mode that means re-searching the file from the start; in tail mode
  // (not live) it means re-filtering the current tail window; live tail
  // picks up the change on its own since grepPatterns is in that effect's
  // dependency array (it reconnects and re-seeds with the new filter).
  const applyGrepPatternChange = (nextPatterns) => {
    setGrepPatterns(nextPatterns);
    setGrepHistory([]);
    if (mode === "page") {
      if (nextPatterns.length > 0) {
        loadGrep(0, true, nextPatterns);
      } else {
        // No filters left - fall back to plain paging from the start.
        setPageHistory([]);
        loadPage(0);
      }
    } else if (mode === "tail" && !liveTail) {
      loadTail(nextPatterns);
    }
  };

  const addGrepPattern = () => {
    const value = grepInput.trim();
    if (!value) return;
    const next = grepPatterns.includes(value) ? grepPatterns : [...grepPatterns, value];
    setGrepInput("");
    applyGrepPatternChange(next);
  };

  const removeGrepPattern = (pattern) => {
    applyGrepPatternChange(grepPatterns.filter((existing) => existing !== pattern));
  };

  const clearGrepPatterns = () => {
    setGrepInput("");
    applyGrepPatternChange([]);
  };

  const handleGrepNext = () => {
    setGrepHistory((current) => [...current, grepOffset]);
    loadGrep(nextOffset, false);
  };
  const handleGrepPrev = () => {
    setGrepHistory((current) => {
      if (current.length === 0) return current;
      loadGrep(current[current.length - 1], false);
      return current.slice(0, -1);
    });
  };

  const selectedFileInfo = logFiles.find((file) => file.name === selectedFile) || null;
  // Only Less (page) mode's grep chips represent "the current filter" in a
  // way that makes sense to download - Tail's own filter is a live view of
  // a moving window, not a fixed result set, and there's no Download button
  // in Tail mode at all (see the toolbar below).
  const activeDownloadFilters = mode === "page" ? grepPatterns : [];
  const isFilteredDownload = activeDownloadFilters.length > 0;

  // Always confirm before pulling a whole file (or scanning it for a grep
  // download) over the wire - log files can run into the hundreds of MB.
  const requestDownload = () => {
    if (!target || !selectedFile || !canDownload) return;
    setDownloadConfirmOpen(true);
  };

  const confirmDownload = () => {
    if (!target || !selectedFile) return;
    setDownloadConfirmOpen(false);
    setDownloading(true);

    const request = isFilteredDownload
      ? (() => {
          // Built manually, not via axios `params` - see loadGrep for why
          // repeated pattern= keys need this instead of axios's array
          // serialization.
          const query = new URLSearchParams();
          query.set("region", target.region);
          query.set("ip", target.ip);
          query.set("tag", target.tag);
          query.set("file", selectedFile);
          activeDownloadFilters.forEach((pattern) => query.append("pattern", pattern));
          query.set("ignore_case", grepIgnoreCase);
          query.set("regex", grepRegex);
          return API.get(`/watcher-control/component/logs/grep/download?${query.toString()}`, {
            responseType: "blob",
          });
        })()
      : API.get("/watcher-control/component/logs/download", {
          params: { region: target.region, ip: target.ip, tag: target.tag, file: selectedFile },
          responseType: "blob",
        });

    request
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.download = isFilteredDownload ? buildFilteredFilename(selectedFile) : selectedFile;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        setContentError(
          err.response?.data?.detail || err.response?.data?.error_message || "Failed to download log."
        );
      })
      .finally(() => setDownloading(false));
  };

  const handleCopy = () => {
    if (!lines.length) return;
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 2, flexShrink: 0 }}>
        <FormControl size="small" sx={{ minWidth: 240 }} disabled={logFilesLoading || logFiles.length === 0}>
          <InputLabel sx={{ color: "rgba(255,255,255,0.7)" }}>Log file</InputLabel>
          <Select
            value={selectedFile}
            label="Log file"
            onChange={(event) => setSelectedFile(event.target.value)}
            sx={{ color: "white" }}
          >
            {logFiles.map((file) => (
              <MenuItem key={file.name} value={file.name}>
                {file.name} — {formatBytes(file.size)} · {formatModified(file.modified)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          size="small"
          value={mode}
          exclusive
          onChange={(_event, value) => value && setMode(value)}
        >
          <ToggleButton value="tail" sx={{ color: "white" }}>
            Tail
          </ToggleButton>
          <ToggleButton value="page" sx={{ color: "white" }}>
            Less
          </ToggleButton>
        </ToggleButtonGroup>

        <FormControlLabel
          control={<Switch size="small" checked={wrapLines} onChange={(event) => setWrapLines(event.target.checked)} />}
          label={<Typography variant="body2">Wrap</Typography>}
        />

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Copy visible lines">
          <span>
            <Button
              size="small"
              startIcon={<ContentCopyIcon fontSize="small" />}
              onClick={handleCopy}
              disabled={!lines.length}
              sx={{ color: "white" }}
            >
              Copy
            </Button>
          </span>
        </Tooltip>
        {/* Tail is a live, constantly-scrolling window, not a fixed file
            you'd download - Less (page) is the only mode that represents a
            stable result set, filtered or not. */}
        {mode === "page" ? (
          <Tooltip
            title={
              !canDownload
                ? "You don't have permission to download logs"
                : isFilteredDownload
                ? "Download only the lines matching the current filters"
                : "Download the full file"
            }
          >
            <span>
              <Button
                size="small"
                startIcon={
                  downloading ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon fontSize="small" />
                }
                onClick={requestDownload}
                disabled={!canDownload || !selectedFile || downloading}
                sx={{ color: "white" }}
              >
                {isFilteredDownload ? "Download filtered" : "Download"}
              </Button>
            </span>
          </Tooltip>
        ) : null}
      </Box>

      {mode === "tail" ? (
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 1.5, flexWrap: "wrap", flexShrink: 0 }}>
          <FormControl size="small" sx={{ minWidth: 110 }} disabled={liveTail}>
            <Select value={tailLines} onChange={(event) => setTailLines(event.target.value)} sx={{ color: "white" }}>
              {TAIL_LINE_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option} lines
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={() => loadTail()}
            disabled={contentLoading || liveTail}
            sx={{ color: "white" }}
          >
            Refresh
          </Button>
          <FormControlLabel
            control={<Switch size="small" checked={liveTail} onChange={(event) => setLiveTail(event.target.checked)} />}
            label={<Typography variant="body2">Live tail</Typography>}
          />
          {liveTail ? (
            <Chip
              size="small"
              label={liveConnected ? "Connected" : "Reconnecting…"}
              color={liveConnected ? "success" : "warning"}
              sx={{ height: 22 }}
            />
          ) : null}
        </Box>
      ) : null}

      {mode === "page" && grepPatterns.length === 0 ? (
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 1.5, flexWrap: "wrap", flexShrink: 0 }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={pageLines}
              onChange={(event) => {
                setPageLines(event.target.value);
                setPageHistory([]);
                loadPage(0);
              }}
              sx={{ color: "white" }}
            >
              {PAGE_LINE_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option} lines/page
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Jump to start">
            <span>
              <Button
                size="small"
                startIcon={<FirstPageIcon fontSize="small" />}
                onClick={handlePageStart}
                disabled={contentLoading || (pageOffset === 0 && pageHistory.length === 0)}
                sx={{ color: "white" }}
              >
                Start
              </Button>
            </span>
          </Tooltip>
          <Button
            size="small"
            startIcon={<ChevronLeftIcon fontSize="small" />}
            onClick={handlePagePrev}
            disabled={contentLoading || pageHistory.length === 0}
            sx={{ color: "white" }}
          >
            Previous
          </Button>
          <Button
            size="small"
            endIcon={<ChevronRightIcon fontSize="small" />}
            onClick={handlePageNext}
            disabled={contentLoading || eof}
            sx={{ color: "white" }}
          >
            Next
          </Button>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
            {formatBytes(pageOffset)} of {formatBytes(totalSize)}
          </Typography>
        </Box>
      ) : null}

      {mode === "tail" || mode === "page" ? (
        <Box sx={{ mb: 1.5, flexShrink: 0 }}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
            <TextField
              size="small"
              placeholder={
                grepPatterns.length
                  ? "Add another filter (narrows further)…"
                  : mode === "tail"
                  ? "Filter the tail (like tail | grep)…"
                  : "Search within the file (like less + grep)…"
              }
              value={grepInput}
              onChange={(event) => setGrepInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addGrepPattern();
              }}
              sx={{ minWidth: 220, input: { color: "white" } }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={grepIgnoreCase}
                  onChange={(event) => setGrepIgnoreCase(event.target.checked)}
                />
              }
              label={<Typography variant="body2">Ignore case</Typography>}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={grepRegex} onChange={(event) => setGrepRegex(event.target.checked)} />}
              label={<Typography variant="body2">Regex</Typography>}
              sx={{ mr: 0 }}
            />
            <Tooltip title="Regex syntax guide">
              <IconButton
                size="small"
                onClick={(event) => setRegexHelpAnchor(event.currentTarget)}
                sx={{ color: "rgba(255,255,255,0.6)" }}
              >
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              variant="outlined"
              onClick={addGrepPattern}
              disabled={!grepInput.trim() || contentLoading}
              sx={{ color: "white", borderColor: "rgba(255,255,255,0.4)" }}
            >
              {grepPatterns.length ? "Add filter" : mode === "tail" ? "Filter" : "Search"}
            </Button>
            {mode === "page" && grepPatterns.length > 0 ? (
              <>
                <Button
                  size="small"
                  startIcon={<ChevronLeftIcon fontSize="small" />}
                  onClick={handleGrepPrev}
                  disabled={contentLoading || grepHistory.length === 0}
                  sx={{ color: "white" }}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  endIcon={<ChevronRightIcon fontSize="small" />}
                  onClick={handleGrepNext}
                  disabled={contentLoading || eof}
                  sx={{ color: "white" }}
                >
                  Next matches
                </Button>
              </>
            ) : null}
          </Box>
          {grepPatterns.length > 0 ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                Chained filters (all must match):
              </Typography>
              {grepPatterns.map((pattern) => (
                <Chip
                  key={pattern}
                  label={pattern}
                  size="small"
                  onDelete={() => removeGrepPattern(pattern)}
                  sx={{ fontFamily: "monospace" }}
                />
              ))}
              <Button size="small" onClick={clearGrepPatterns} sx={{ color: "rgba(255,255,255,0.6)" }}>
                Clear all
              </Button>
            </Box>
          ) : null}
        </Box>
      ) : null}

      {logFilesError ? (
        <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }}>
          {logFilesError}
        </Alert>
      ) : null}
      {contentError ? (
        <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }}>
          {contentError}
        </Alert>
      ) : null}
      {mode === "page" && grepPatterns.length > 0 && scanTruncated && lines.length === 0 ? (
        <Alert severity="info" sx={{ mb: 1.5, flexShrink: 0 }}>
          No matches in the scanned range yet — click &quot;Next matches&quot; to keep searching.
        </Alert>
      ) : null}

      <Box
        ref={contentRef}
        sx={{
          flex: "1 1 auto",
          minHeight: 300,
          overflow: "auto",
          bgcolor: "rgba(0,0,0,0.35)",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          p: 1.5,
          fontFamily: "monospace",
          fontSize: 12.5,
          whiteSpace: wrapLines ? "pre-wrap" : "pre",
          wordBreak: wrapLines ? "break-all" : "normal",
          color: "rgba(230,240,255,0.92)",
        }}
      >
        {logFilesLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : !selectedFile ? (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)", whiteSpace: "normal" }}>
            {logFiles.length === 0 && !logFilesLoading
              ? "No log files found in this component's log directory."
              : "Select a log file to begin."}
          </Typography>
        ) : contentLoading && lines.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : lines.length === 0 ? (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)", whiteSpace: "normal" }}>
            No lines to show.
          </Typography>
        ) : (
          lines.map((line, index) => (
            <Box key={index} sx={{ display: "flex" }}>
              <Box component="span">
                {grepPatterns.length > 0 ? highlightMatches(line, grepPatterns, grepRegex, grepIgnoreCase) : line}
              </Box>
            </Box>
          ))
        )}
      </Box>

      <Popover
        open={Boolean(regexHelpAnchor)}
        anchorEl={regexHelpAnchor}
        onClose={() => setRegexHelpAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              maxWidth: 420,
              bgcolor: "rgba(15,23,42,0.98)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.12)",
            },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Regex mode
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", mb: 1.5 }}>
          With Regex checked, each filter you add is compiled as a real regular expression instead of a plain
          substring - this covers the same ground as egrep&apos;s extended syntax (alternation, character
          classes, quantifiers, anchors, groups). Each filter is unanchored by default, so it matches anywhere
          in the line unless you anchor it with <Box component="code">^</Box> / <Box component="code">$</Box>.
        </Typography>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", mb: 1.5 }} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            columnGap: 1.5,
            rowGap: 0.75,
          }}
        >
          {REGEX_CHEATSHEET.map((entry) => (
            <Box key={entry.pattern} sx={{ display: "contents" }}>
              <Typography variant="body2" sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>
                {entry.pattern}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                {entry.meaning}
              </Typography>
            </Box>
          ))}
        </Box>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", my: 1.5 }} />
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
          Multiple filter chips are ANDed together (like <Box component="code">grep a | grep b</Box>) - put OR
          alternatives inside one pattern instead, e.g. one chip <Box component="code">ERROR|FATAL</Box> rather
          than two separate chips. POSIX bracket classes like <Box component="code">[[:alpha:]]</Box> aren&apos;t
          supported here - use <Box component="code">\w</Box> or <Box component="code">[a-zA-Z]</Box>.
        </Typography>
      </Popover>

      <Dialog open={downloadConfirmOpen} onClose={() => setDownloadConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{isFilteredDownload ? "Download filtered log?" : "Download log file?"}</DialogTitle>
        <DialogContent>
          {isFilteredDownload ? (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                This downloads only the lines in{" "}
                <Box component="span" sx={{ fontFamily: "monospace" }}>
                  {selectedFile}
                </Box>{" "}
                matching every filter below - not the full file.
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
                {activeDownloadFilters.map((pattern) => (
                  <Chip key={pattern} label={pattern} size="small" sx={{ fontFamily: "monospace" }} />
                ))}
              </Box>
              <Typography variant="body2" color="text.secondary">
                This scans the entire file (not just what&apos;s currently loaded on screen), so it can take a
                while on a large file.
              </Typography>
            </>
          ) : (
            <Typography variant="body2">
              <Box component="span" sx={{ fontFamily: "monospace" }}>
                {selectedFile}
              </Box>{" "}
              is{" "}
              <Box component="span" sx={{ fontWeight: 700 }}>
                {formatBytes(selectedFileInfo?.size)}
              </Box>
              . Large files can take a while to download and use a noticeable amount of bandwidth.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmDownload}>
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

ComponentLogViewer.propTypes = {
  target: PropTypes.shape({
    region: PropTypes.string,
    ip: PropTypes.string,
    tag: PropTypes.string,
  }).isRequired,
  canDownload: PropTypes.bool,
};

ComponentLogViewer.defaultProps = {
  canDownload: false,
};

export default ComponentLogViewer;
