// EC2DetailsFilterBar.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Autocomplete,
  TextField,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PropTypes from "prop-types";
import { useData } from "../../DataContext";
// import { ClickAwayListener } from "@mui/material";

const FILTER_KEYS = ["name", "ip", "region", "status", "instance_type"];
const STATUS_OPTIONS = ["running", "stopped", "terminated"];

const EC2DetailsFilterBar = ({
  nameSuggestions,
  ipSuggestions,
  regionSuggestions,
  statusOptions,
  instanceTypeSuggestions,
  onRefresh,
  loading,
  onFilterTokensChange,
}) => {
  const defaultRegions = useData().awsRegions;
  const [filterTokens, setFilterTokens] = useState([]);
  const [currentKey, setCurrentKey] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);

  // Expose tokens to parent
  useEffect(() => {
    onFilterTokensChange(filterTokens);
  }, [filterTokens, onFilterTokensChange]);

  const suggestions = useMemo(() => {
    if (currentKey) {
      const map = {
        name: nameSuggestions,
        ip: ipSuggestions,
        region: regionSuggestions.length ? regionSuggestions : defaultRegions,
        status: statusOptions,
        instance_type: instanceTypeSuggestions,
      };
      const frag = inputValue.includes(":")
        ? inputValue.split(":")[1].toLowerCase()
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
    defaultRegions,
    nameSuggestions,
    ipSuggestions,
    regionSuggestions,
    statusOptions,
    instanceTypeSuggestions,
  ]);

  const commitInput = (value) => {
    if (!value) return;

    // Top-level AND-split
    if (
      !currentKey &&
      /\s+AND\s+/i.test(value) &&
      value.split(/\s+AND\s+/i).every((s) => s.includes(":"))
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
    // Top-level OR-split
    if (
      !currentKey &&
      /\s+OR\s+/i.test(value) &&
      value.split(/\s+OR\s+/i).every((s) => s.includes(":"))
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
      {/* <ClickAwayListener onClickAway={() => setOpen(false)}> */}
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
          onInputChange={(e, val, reason) =>
            reason === "input" && (setInputValue(val), setOpen(true))
          }
          onChange={(e, val, reason) =>
            reason === "selectOption" && commitInput(val)
          }
          onKeyDown={(e) =>
            e.key === "Enter" &&
            (commitInput(inputValue.trim()), e.preventDefault())
          }
          onFocus={() => setOpen(true)}
          sx={{ flex: 1 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={currentKey ? `Select ${currentKey}` : "Filter"}
              placeholder={currentKey ? "Type or select value" : "Add filter"}
              variant="outlined"
              fullWidth
            />
          )}
        />
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
      {/* </ClickAwayListener> */}
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
    </>
  );
};

EC2DetailsFilterBar.propTypes = {
  setFilterName: PropTypes.func.isRequired,
  setFilterPrivateIp: PropTypes.func.isRequired,
  setFilterRegion: PropTypes.func.isRequired,
  setFilterStatus: PropTypes.func.isRequired,
  setFilterInstanceType: PropTypes.func.isRequired,
  nameSuggestions: PropTypes.array,
  ipSuggestions: PropTypes.array,
  regionSuggestions: PropTypes.array,
  statusOptions: PropTypes.array,
  instanceTypeSuggestions: PropTypes.array,
  onRefresh: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  onFilterTokensChange: PropTypes.func.isRequired,
};
EC2DetailsFilterBar.defaultProps = {
  nameSuggestions: [],
  ipSuggestions: [],
  regionSuggestions: [],
  statusOptions: STATUS_OPTIONS,
  instanceTypeSuggestions: [],
  onFilterTokensChange: () => {},
};

export default EC2DetailsFilterBar;
