/* ComponentsFilterBar.jsx */
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
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import PropTypes from "prop-types";

const FILTER_KEYS = [
  "region",
  "ip",
  "platform",
  "name",
  "pipeline",
  "version",
  "release_date",
];

function ComponentsFilterBar({
  onFilterTokensChange,
  regions,
  platforms,
  componentNameSuggestions,
  ipSuggestions,
  versionSuggestions,
  releaseDateSuggestions,
  exportToExcel,
  onRefresh,
  loading,
  setOpenModal,
  setModalInitialComponent,
}) {
  const userRole = localStorage.getItem("user");
  const [cautionOpen, setCautionOpen] = useState(false);
  const [cautionMessage, setCautionMessage] = useState("");
  const [filterTokens, setFilterTokens] = useState([]);
  const [currentKey, setCurrentKey] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const pipelineSuggestions = useMemo(() => ["Yes", "No"], []);

  // Notify parent of token changes
  useEffect(() => {
    onFilterTokensChange(filterTokens);
  }, [filterTokens, onFilterTokensChange]);

  const openCaution = (msg) => {
    setCautionMessage(msg);
    setCautionOpen(true);
  };
  const closeCaution = () => setCautionOpen(false);
  const handleAddComponentClick = () => {
    if (userRole === "feedops") {
      setOpenModal(true);
      setModalInitialComponent(null);
    } else {
      openCaution("You don't have access to Add Components");
    }
  };

  const suggestions = useMemo(() => {
    if (currentKey) {
      const map = {
        region: regions,
        ip: ipSuggestions,
        platform: platforms,
        name: componentNameSuggestions,
        pipeline: pipelineSuggestions,
        version: versionSuggestions,
        release_date: releaseDateSuggestions,
      };
      const frag = inputValue.includes(":")
        ? inputValue.split(":", 2)[1].toLowerCase()
        : "";
      return (map[currentKey] || []).filter((v) =>
        v?.toLowerCase().startsWith(frag)
      );
    }
    const frag = inputValue.toLowerCase();
    return FILTER_KEYS.filter((k) => k.startsWith(frag)).map((k) => `${k}:`);
  }, [
    currentKey,
    inputValue,
    regions,
    ipSuggestions,
    platforms,
    componentNameSuggestions,
    pipelineSuggestions,
    versionSuggestions,
    releaseDateSuggestions,
  ]);

  const commitInput = (value) => {
    if (!value) return;
    // Top-level AND
    if (
      !currentKey &&
      /\s+AND\s+/i.test(value) &&
      value.split(/\s+AND\s+/i).every((seg) => seg.includes(":"))
    ) {
      value.split(/\s+AND\s+/i).forEach((seg) => {
        const [k, v] = seg.trim().split(":");
        setFilterTokens((prev) =>
          prev.some((t) => t.key === k && t.value === v)
            ? prev
            : [...prev, { key: k, value: v, operator: "AND" }]
        );
      });
      setInputValue("");
      setOpen(false);
      return;
    }
    // Top-level OR
    if (
      !currentKey &&
      /\s+OR\s+/i.test(value) &&
      value.split(/\s+OR\s+/i).every((seg) => seg.includes(":"))
    ) {
      value.split(/\s+OR\s+/i).forEach((seg) => {
        const [k, v] = seg.trim().split(":");
        setFilterTokens((prev) =>
          prev.some((t) => t.key === k && t.value === v)
            ? prev
            : [...prev, { key: k, value: v, operator: "OR" }]
        );
      });
      setInputValue("");
      setOpen(false);
      return;
    }
    // Selecting key
    if (!currentKey && value.endsWith(":")) {
      const key = value.slice(0, -1);
      setCurrentKey(key);
      setInputValue(`${key}:`);
      setOpen(true);
      return;
    }
    // Within key context
    if (currentKey) {
      const raw = value.startsWith(`${currentKey}:`)
        ? value.slice(currentKey.length + 1).trim()
        : value.trim();
      // AND in values
      const andParts = raw
        .split(/\s+AND\s+/i)
        .map((p) => p.trim())
        .filter(Boolean);
      if (andParts.length > 1) {
        andParts.forEach((part) => {
          setFilterTokens((prev) =>
            prev.some((t) => t.key === currentKey && t.value === part)
              ? prev
              : [...prev, { key: currentKey, value: part, operator: "AND" }]
          );
        });
        setCurrentKey("");
        setInputValue("");
        setOpen(false);
        return;
      }
      // OR in values
      const orParts = raw
        .split(/\s+OR\s+/i)
        .map((p) => p.trim())
        .filter(Boolean);
      if (orParts.length > 1) {
        orParts.forEach((part) => {
          setFilterTokens((prev) =>
            prev.some((t) => t.key === currentKey && t.value === part)
              ? prev
              : [...prev, { key: currentKey, value: part, operator: "OR" }]
          );
        });
        setCurrentKey("");
        setInputValue("");
        setOpen(false);
        return;
      }
      if (!raw) {
        setCurrentKey("");
        setInputValue("");
        setOpen(false);
        return;
      }
      // Single value in currentKey => default AND
      setFilterTokens((prev) =>
        prev.some((t) => t.key === currentKey && t.value === raw)
          ? prev
          : [...prev, { key: currentKey, value: raw, operator: "AND" }]
      );
      setCurrentKey("");
      setInputValue("");
      setOpen(false);
      return;
    }
    // Fallback single key:value
    if (value.includes(":")) {
      const [k, v] = value.split(":");
      setFilterTokens((prev) =>
        prev.some((t) => t.key === k && t.value === v)
          ? prev
          : [...prev, { key: k, value: v, operator: "AND" }]
      );
      setInputValue("");
      setOpen(false);
    }
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Autocomplete
          freeSolo
          disableClearable
          disableCloseOnSelect
          selectOnFocus
          clearOnBlur={false}
          handleHomeEndKeys
          openOnFocus
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          options={suggestions}
          filterOptions={(opts) => opts}
          inputValue={inputValue}
          onInputChange={(e, val, reason) => {
            if (reason === "input") {
              setInputValue(val);
              setOpen(true);
            }
          }}
          onChange={(e, val, reason) =>
            reason === "selectOption" && commitInput(val)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitInput(inputValue.trim());
              e.preventDefault();
            }
          }}
          onFocus={() => setOpen(true)}
          sx={{ flex: 1 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={currentKey ? `Select ${currentKey}` : "Filter"}
              placeholder={currentKey ? "Type or select value" : "Add filter"}
              variant="outlined"
            />
          )}
        />
        <Tooltip title="Export to Excel">
          <IconButton onClick={exportToExcel}>
            <FileDownloadIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Add Component">
          <IconButton onClick={handleAddComponentClick}>
            <AddIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Refresh Data">
          <IconButton onClick={onRefresh}>
            <RefreshIcon
              sx={{
                animation: loading ? "spin 2s linear infinite" : "none",
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
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

ComponentsFilterBar.propTypes = {
  onFilterTokensChange: PropTypes.func.isRequired,
  regions: PropTypes.array.isRequired,
  platforms: PropTypes.array.isRequired,
  componentNameSuggestions: PropTypes.array.isRequired,
  ipSuggestions: PropTypes.array.isRequired,
  versionSuggestions: PropTypes.array.isRequired,
  releaseDateSuggestions: PropTypes.array.isRequired,
  exportToExcel: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  setOpenModal: PropTypes.func.isRequired,
  setModalInitialComponent: PropTypes.func.isRequired,
};

export default ComponentsFilterBar;
