// src/components/tree/TreeHeader.jsx
import React from "react";
import {
  Box,
  Autocomplete,
  TextField,
  IconButton,
  Tooltip,
  useTheme,
  Typography,
} from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import RefreshIcon from "@mui/icons-material/Refresh";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SearchIcon from "@mui/icons-material/Search";
import PropTypes from "prop-types";
import StatusChip from "../HostDetails/StatusChip";
import hexToRgb from "../shared/hexToRgb";

const HEADER_ACCENT = "#FF6B35";
const SEARCH_ACCENT = "#60A5FA";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
  "&.Mui-disabled": { color: "text.disabled", bgcolor: "transparent" },
});

const pillFieldSx = (color) => {
  const rgb = hexToRgb(color);
  return {
    "& .MuiOutlinedInput-root": {
      borderRadius: 999,
      "& fieldset": { borderColor: "rgba(148, 163, 184, 0.32)" },
      "&:hover fieldset": { borderColor: `rgba(${rgb}, 0.6)` },
      "&.Mui-focused fieldset": { borderColor: color },
    },
  };
};

const pillAutocompletePaperProps = (color) => {
  const rgb = hexToRgb(color);
  return {
    sx: {
      mt: 1,
      borderRadius: "12px",
      border: "1px solid rgba(148, 163, 184, 0.16)",
      "& .MuiAutocomplete-listbox": { py: 0.5 },
      "& .MuiAutocomplete-option": {
        borderRadius: "8px",
        mx: 0.75,
        my: 0.15,
        minHeight: 32,
        py: 0.25,
        fontSize: 13,
      },
      "& .MuiAutocomplete-option.Mui-focused": {
        bgcolor: `rgba(${rgb}, 0.12)`,
      },
      "& .MuiAutocomplete-option[aria-selected='true']": {
        bgcolor: `rgba(${rgb}, 0.16)`,
        color,
        fontWeight: 600,
      },
      "& .MuiAutocomplete-option[aria-selected='true'].Mui-focused": {
        bgcolor: `rgba(${rgb}, 0.24)`,
      },
    },
  };
};

const TreeHeader = ({
  nodes,
  selectedComponentId,
  onSelect,
  isFullscreen,
  onToggleFullscreen,
  onRefresh,
  isRefreshing,
  onZoomIn,
  onZoomOut,
  onFit,
  onHierarchy,
  containerRef,
  showSearch = true,
}) => {
  const theme = useTheme();

  const headerGradient =
    theme.palette.mode === "light"
      ? "linear-gradient(90deg, rgba(25,118,210,0.10), rgba(0,172,193,0.10))"
      : "linear-gradient(90deg, rgba(144,202,249,0.10), rgba(77,208,225,0.10))";

  return (
    <>
      {/* Header Section with Logo and Title */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccountTreeIcon sx={{ color: HEADER_ACCENT }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Component Map
          </Typography>
        </Box>

        <StatusChip label={`${nodes.length} components`} color="#60A5FA" Icon={AccountTreeIcon} />
      </Box>

      {/* Filter Bar - Elements directly on background */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 3 }}>
        {showSearch ? (
          <Autocomplete
            sx={{ width: 320, ...pillFieldSx(SEARCH_ACCENT) }}
            options={nodes}
            getOptionLabel={(o) => (o ? `${o.name} (${o.ip})` : "")}
            value={nodes.find((n) => n.id === selectedComponentId) || null}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(e, v) => onSelect(v?.id || null)}
            disablePortal={isFullscreen}
            slotProps={{ paper: pillAutocompletePaperProps(SEARCH_ACCENT) }}
            componentsProps={{
              popper: {
                placement: "bottom-start",
                sx: { zIndex: (t) => t.zIndex.modal + 3 },
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Component"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <SearchIcon sx={{ fontSize: 18, color: SEARCH_ACCENT, ml: 0.5 }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        ) : null}

        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={onRefresh} disabled={isRefreshing} sx={tintedIconButtonSx("#60A5FA")}>
              {isRefreshing ? (
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "2px solid",
                    borderColor: theme.palette.primary.main,
                    borderTopColor: "transparent",
                    animation: "spin 1s linear infinite",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Zoom In">
          <IconButton onClick={onZoomIn} sx={tintedIconButtonSx("#94A3B8")}>
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton onClick={onZoomOut} sx={tintedIconButtonSx("#94A3B8")}>
            <ZoomOutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Fit to Screen">
          <IconButton onClick={onFit} sx={tintedIconButtonSx("#34D399")}>
            <FitScreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Hierarchy Format">
          <IconButton onClick={onHierarchy} sx={tintedIconButtonSx("#A78BFA")}>
            <AccountTreeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
          <IconButton onClick={onToggleFullscreen} sx={tintedIconButtonSx("#F59E0B")}>
            {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
    </>
  );
};

TreeHeader.propTypes = {
  nodes: PropTypes.array.isRequired,
  selectedComponentId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  isFullscreen: PropTypes.bool.isRequired,
  onToggleFullscreen: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool.isRequired,
  onZoomIn: PropTypes.func.isRequired,
  onZoomOut: PropTypes.func.isRequired,
  onFit: PropTypes.func.isRequired,
  onHierarchy: PropTypes.func.isRequired,
  containerRef: PropTypes.object,
  showSearch: PropTypes.bool,
};

export default TreeHeader;
