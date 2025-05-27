/* SchedulerFilterBar.jsx */
import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Autocomplete,
  TextField,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import PropTypes from "prop-types";

const FILTER_KEYS = ["ip", "executed", "schedule_enabled", "region"];

function SchedulerFilterBar({
  onFilterTokensChange,
  ipSuggestions,
  executedSuggestions,
  scheduleEnabledSuggestions,
  regionSuggestions,
  onRefresh,
  loading,
  onOpenModal,
  onOpenLambda,
}) {
  const userRole = localStorage.getItem("user");
  const [filterTokens, setFilterTokens] = useState([]);
  const [currentKey, setCurrentKey] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [cautionOpen, setCautionOpen] = useState(false);
  const [cautionMessage, setCautionMessage] = useState("");

  useEffect(() => {
    onFilterTokensChange(filterTokens);
  }, [filterTokens, onFilterTokensChange]);

  const openCaution = (msg) => {
    setCautionMessage(msg);
    setCautionOpen(true);
  };
  const closeCaution = () => {
    setCautionOpen(false);
    setCautionMessage("");
  };
  const handleLambdaClick = () =>
    userRole === "feedops"
      ? onOpenLambda()
      : openCaution("You don't have access to run Lambda");
  const handleAddTagsClick = () =>
    userRole === "feedops"
      ? onOpenModal()
      : openCaution("You don't have access to add tags");

  const suggestions = useMemo(() => {
    if (currentKey) {
      const map = {
        ip: ipSuggestions,
        executed: executedSuggestions,
        schedule_enabled: scheduleEnabledSuggestions,
        region: regionSuggestions,
      };
      const rawFrag = inputValue.includes(":")
        ? inputValue.split(":", 2)[1].toLowerCase()
        : "";
      return (map[currentKey] || []).filter((v) =>
        v.toLowerCase().startsWith(rawFrag)
      );
    }
    const frag = inputValue.toLowerCase();
    return FILTER_KEYS.filter((k) => k.startsWith(frag)).map((k) => `${k}:`);
  }, [
    currentKey,
    inputValue,
    ipSuggestions,
    executedSuggestions,
    scheduleEnabledSuggestions,
    regionSuggestions,
  ]);

  const commitInput = (value) => {
    if (!value) return;
    // top-level AND/OR
    if (
      !currentKey &&
      /\s+AND\s+/i.test(value) &&
      value.split(/\s+AND\s+/i).every((seg) => seg.includes(":"))
    ) {
      value.split(/\s+AND\s+/i).forEach((seg) => addToken(seg, "AND"));
      resetInput();
      return;
    }
    if (
      !currentKey &&
      /\s+OR\s+/i.test(value) &&
      value.split(/\s+OR\s+/i).every((seg) => seg.includes(":"))
    ) {
      value.split(/\s+OR\s+/i).forEach((seg) => addToken(seg, "OR"));
      resetInput();
      return;
    }
    // select key
    if (!currentKey && value.endsWith(":")) {
      const key = value.slice(0, -1);
      if (FILTER_KEYS.includes(key)) {
        setCurrentKey(key);
        setInputValue(`${key}:`);
        setOpen(true);
      }
      return;
    }
    // within key
    if (currentKey) {
      const raw = value.startsWith(`${currentKey}:`)
        ? value.slice(currentKey.length + 1).trim()
        : value.trim();
      if (/\s+AND\s+/i.test(raw)) {
        raw
          .split(/\s+AND\s+/i)
          .forEach((part) => addToken(`${currentKey}:${part}`, "AND"));
        resetKey();
        return;
      }
      if (/\s+OR\s+/i.test(raw)) {
        raw
          .split(/\s+OR\s+/i)
          .forEach((part) => addToken(`${currentKey}:${part}`, "OR"));
        resetKey();
        return;
      }
      // single
      if (raw) {
        addToken(`${currentKey}:${raw}`, "AND");
        resetKey();
        return;
      }
      resetKey();
      return;
    }
    // fallback key:value
    if (value.includes(":")) {
      addToken(value, "AND");
      resetInput();
    }
  };

  const addToken = (kv, op) => {
    const [k, v] = kv.split(":");
    setFilterTokens((prev) =>
      prev.some((t) => t.key === k && t.value === v)
        ? prev
        : [...prev, { key: k, value: v, operator: op }]
    );
  };
  const resetInput = () => {
    setInputValue("");
    setOpen(false);
    setCurrentKey("");
  };
  const resetKey = () => {
    setInputValue("");
    setOpen(false);
    setCurrentKey("");
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Autocomplete
          freeSolo
          disableClearable
          disableCloseOnSelect
          openOnFocus
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          options={suggestions}
          filterOptions={(opts) => opts}
          inputValue={inputValue}
          onInputChange={(e, val, reason) =>
            reason === "input" && (setInputValue(val), setOpen(true))
          }
          onChange={(e, val, reason) =>
            reason === "selectOption" && commitInput(val)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitInput(inputValue.trim());
              e.preventDefault();
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={currentKey ? `Select ${currentKey}` : "Filter"}
              placeholder={currentKey ? "Type or select" : "Add filter"}
              variant="outlined"
              fullWidth
            />
          )}
          sx={{ flex: 1 }}
        />
        <Tooltip title="Add / Modify Tags">
          <IconButton onClick={handleAddTagsClick}>
            <AddCircleOutlineIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Run Lambda">
          <IconButton onClick={handleLambdaClick}>
            <CloudQueueIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Refresh Data">
          <IconButton onClick={onRefresh}>
            <RefreshIcon
              sx={{
                animation: loading ? "spin 2s linear infinite" : "none",
                "@keyframes spin": {
                  "0%": { transform: "rotate(0)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        {filterTokens.map((t, i) => (
          <Chip
            key={`${t.key}:${t.value}:${i}`}
            label={`${t.key}:${t.value}`}
            onDelete={() =>
              setFilterTokens((prev) => prev.filter((_, idx) => idx !== i))
            }
            variant="outlined"
          />
        ))}
        {filterTokens.length > 0 && (
          <Chip
            label="Clear filters"
            onClick={() => setFilterTokens([])}
            color="primary"
            variant="outlined"
          />
        )}
      </Box>
      <Dialog open={cautionOpen} onClose={closeCaution}>
        <DialogTitle>Caution</DialogTitle>
        <DialogContent>
          <DialogContentText>{cautionMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCaution}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

SchedulerFilterBar.propTypes = {
  onFilterTokensChange: PropTypes.func.isRequired,
  ipSuggestions: PropTypes.array.isRequired,
  executedSuggestions: PropTypes.array.isRequired,
  scheduleEnabledSuggestions: PropTypes.array.isRequired,
  regionSuggestions: PropTypes.array.isRequired,
  onRefresh: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  onOpenModal: PropTypes.func.isRequired,
  onOpenLambda: PropTypes.func.isRequired,
};

export default SchedulerFilterBar;
