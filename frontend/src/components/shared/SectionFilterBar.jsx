import PropTypes from "prop-types";
import {
  Button,
  Checkbox,
  FormControl,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import hexToRgb from "./hexToRgb";

function SectionFilterBar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onSearchClear,
  searchEndAdornment,
  searchDisabled = false,
  searchSx,
  selects,
  extraFilters,
  showClearFilters,
  onClearFilters,
  actions,
  flexWrap = "nowrap",
  sx,
}) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      useFlexGap
      sx={{ mb: 2, flexWrap, alignItems: "center", ...sx }}
    >
      <TextField
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={onSearchChange}
        disabled={searchDisabled}
        sx={searchSx}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: (
            <>
              {searchEndAdornment ? (
                <InputAdornment position="end">{searchEndAdornment}</InputAdornment>
              ) : null}
              {searchValue && !searchDisabled ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={onSearchClear} sx={{ mr: -1 }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null}
            </>
          ),
        }}
      />

      {selects.map((selectConfig) => {
        const isActive = selectConfig.multiple
          ? selectConfig.value.length > 0
          : Boolean(selectConfig.value);
        const accentColor = selectConfig.accentColor || "#60A5FA";
        const accentRgb = hexToRgb(accentColor);
        return (
          <FormControl key={selectConfig.id} sx={{ minWidth: selectConfig.minWidth || 150 }}>
            <Select
              displayEmpty
              multiple={selectConfig.multiple}
              value={selectConfig.value}
              onChange={selectConfig.onChange}
              size="small"
              inputProps={{ "aria-label": selectConfig.label }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    mt: 1,
                    borderRadius: "12px",
                    border: "1px solid rgba(148, 163, 184, 0.16)",
                    "& .MuiMenuItem-root": {
                      borderRadius: "8px",
                      mx: 0.75,
                      my: 0.15,
                      minHeight: 32,
                      py: 0.25,
                      fontSize: 13,
                    },
                    "& .MuiMenuItem-root:hover": {
                      bgcolor: `rgba(${accentRgb}, 0.12)`,
                    },
                    "& .MuiMenuItem-root.Mui-selected": {
                      bgcolor: `rgba(${accentRgb}, 0.16)`,
                      color: accentColor,
                      fontWeight: 600,
                    },
                    "& .MuiMenuItem-root.Mui-selected:hover": {
                      bgcolor: `rgba(${accentRgb}, 0.24)`,
                    },
                    "& .MuiListItemText-root": {
                      my: 0,
                    },
                  },
                },
              }}
              sx={{
                borderRadius: 999,
                "& .MuiSelect-select": {
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  paddingTop: "7px",
                  paddingBottom: "7px",
                  paddingLeft: "12px !important",
                  paddingRight: "28px !important",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderRadius: 999,
                  borderColor: isActive ? `rgba(${accentRgb}, 0.5)` : "rgba(148, 163, 184, 0.32)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: `rgba(${accentRgb}, 0.7)`,
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: accentColor,
                },
              }}
              renderValue={(selected) => {
                const text = selectConfig.multiple
                  ? selected.length === 0
                    ? selectConfig.allLabel
                    : selected.join(", ")
                  : selected
                  ? selectConfig.options.find((option) => option.value === selected)?.label ?? selected
                  : selectConfig.allLabel;
                return (
                  <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center">
                    {selectConfig.icon}
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ fontWeight: isActive ? 600 : 400, color: isActive ? "text.primary" : "text.secondary" }}
                    >
                      {text}
                    </Typography>
                  </Stack>
                );
              }}
            >
              <MenuItem value="">
                {selectConfig.multiple ? (
                  <ListItemText primary={selectConfig.allLabel} />
                ) : (
                  selectConfig.allLabel
                )}
              </MenuItem>
              {selectConfig.options.map((option) =>
                selectConfig.multiple ? (
                  <MenuItem key={`${selectConfig.id}-${option.value}`} value={option.value}>
                    <Checkbox
                      size="small"
                      checked={selectConfig.value.includes(option.value)}
                      sx={{
                        p: 0.5,
                        color: `rgba(${accentRgb}, 0.6)`,
                        "&.Mui-checked": { color: accentColor },
                      }}
                    />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ) : (
                  <MenuItem key={`${selectConfig.id}-${option.value}`} value={option.value}>
                    {option.label}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>
        );
      })}

      {extraFilters}

      {showClearFilters && (
        <Button
          variant="outlined"
          size="small"
          onClick={onClearFilters}
          startIcon={<ClearIcon fontSize="small" />}
          sx={{
            borderRadius: 999,
            borderColor: "rgba(226, 75, 74, 0.4)",
            color: "#E24B4A",
            "&:hover": {
              borderColor: "#E24B4A",
              bgcolor: "rgba(226, 75, 74, 0.08)",
            },
          }}
        >
          Clear Filters
        </Button>
      )}

      {actions}
    </Stack>
  );
}

SectionFilterBar.propTypes = {
  searchPlaceholder: PropTypes.string.isRequired,
  searchValue: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchClear: PropTypes.func.isRequired,
  searchEndAdornment: PropTypes.node,
  searchDisabled: PropTypes.bool,
  searchSx: PropTypes.object,
  selects: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)])
        .isRequired,
      onChange: PropTypes.func.isRequired,
      minWidth: PropTypes.number,
      allLabel: PropTypes.string.isRequired,
      multiple: PropTypes.bool,
      icon: PropTypes.node,
      accentColor: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
        })
      ).isRequired,
    })
  ).isRequired,
  extraFilters: PropTypes.node,
  showClearFilters: PropTypes.bool.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  actions: PropTypes.node,
  flexWrap: PropTypes.string,
  sx: PropTypes.object,
};

export default SectionFilterBar;
