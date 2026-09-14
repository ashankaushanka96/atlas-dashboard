// src/components/SchedulerAddTagsModal.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Autocomplete,
  Tooltip,
  Skeleton,
  Stack,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import PropTypes from "prop-types";
import { useData } from "../../DataContext";
import { API } from "../../services/auth";
import { motion, AnimatePresence } from "framer-motion";
import hexToRgb from "../shared/hexToRgb";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
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

const selectIconSx = (color) => ({ fontSize: 16, color });

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

const pillMenuProps = (color) => {
  const rgb = hexToRgb(color);
  return {
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
          bgcolor: `rgba(${rgb}, 0.12)`,
        },
        "& .MuiMenuItem-root.Mui-selected": {
          bgcolor: `rgba(${rgb}, 0.16)`,
          color,
          fontWeight: 600,
        },
        "& .MuiMenuItem-root.Mui-selected:hover": {
          bgcolor: `rgba(${rgb}, 0.24)`,
        },
      },
    },
  };
};

const PRIMARY_ACCENT = "#34D399";
const REGION_ACCENT = "#60A5FA";
const INSTANCE_ACCENT = "#22D3EE";
const SCHEDULE_ACCENT = "#A78BFA";
const TAG_ACCENT = "#F59E0B";
const DELETE_ACCENT = "#E24B4A";
const CLOSE_ACCENT = "#94A3B8";

const TAG_OPTIONS = [
  "start_time",
  "stop_time",
  "start_time_1",
  "stop_time_1",
  "start_time_2",
  "stop_time_2",
  "start_time_3",
  "stop_time_3",
  "start_time_4",
  "stop_time_4",
  "start_time_5",
  "stop_time_5",
  "start_time_6",
  "stop_time_6",
  "start_time_7",
  "stop_time_7",
];

const getAvailableTagOptions = (tagEntries, currentIndex) => {
  const selectedKeys = tagEntries
    .filter((_, idx) => idx !== currentIndex)
    .map((e) => e.key)
    .filter(Boolean);
  return TAG_OPTIONS.filter(
    (opt) => !selectedKeys.includes(opt) || tagEntries[currentIndex].key === opt
  );
};

const SchedulerAddTagsModal = ({ open, onClose }) => {
  const theme = useTheme();
  const [ips, setIps] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("idle");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedIp, setSelectedIp] = useState(null);
  const [tagEntries, setTagEntries] = useState([]);
  const [scheduleEnabledTag, setScheduleEnabledTag] = useState("not found");
  const { awsRegions, awsIPs, loading } = useData();

  // default region once regions are available
  useEffect(() => {
    if (!selectedRegion && awsRegions.length > 0) {
      setSelectedRegion(awsRegions[0]);
    }
  }, [awsRegions, selectedRegion]);

  // keep ips in sync when region or ip map changes (fixes "No options" on first open)
  useEffect(() => {
    if (selectedRegion) {
      setIps(awsIPs[selectedRegion] || []);
      setSelectedIp(null);
    }
  }, [selectedRegion, awsIPs]);

  const fetchExistingInstanceTages = useCallback(async () => {
    if (!selectedIp?.instance_id || !selectedRegion) return;
    setLoadingTags(true);
    try {
      const response = await API.get(
        `/schedules/fetch-existing-instance-tags`,
        {
          params: {
            region: selectedRegion,
            instance_id: selectedIp.instance_id,
          },
        }
      );
      const fetched = response.data.tags || [];
      setScheduleEnabledTag(response.data.schedule_enabled || "not found");
      setTagEntries(fetched.filter((t) => t.key !== "schedule_enabled"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTags(false);
    }
  }, [selectedIp, selectedRegion]);

  // fetch tags whenever instance/region changes
  useEffect(() => {
    if (selectedRegion && selectedIp) {
      fetchExistingInstanceTages();
    } else {
      setTagEntries([]);
      setScheduleEnabledTag("not found");
    }
  }, [fetchExistingInstanceTages, selectedIp, selectedRegion]);

  const addTagEntry = () =>
    setTagEntries((prev) => [...prev, { key: "", value: "" }]);
  const removeTagEntry = (index) =>
    setTagEntries((prev) => prev.filter((_, i) => i !== index));

  const updateInstanceTags = async (payload) => {
    try {
      await API.post(`/schedules/update-instance-tags`, payload);
      setUpdateStatus("success");
    } catch (err) {
      console.error(err);
      alert("Error updating tags");
      setUpdateStatus("idle");
    }
  };

  const handleApply = () => {
    if (!selectedIp?.instance_id) {
      alert("Please select a valid instance (IP).");
      return;
    }
    for (const entry of tagEntries) {
      if (!entry.key || !entry.value) {
        alert("Please fill out all tag entries.");
        return;
      }
    }
    setUpdateStatus("loading");
    const tags = [
      ...tagEntries.map((e) => ({ key: e.key, value: e.value })),
      { key: "schedule_enabled", value: scheduleEnabledTag },
    ];
    updateInstanceTags({
      region: selectedRegion,
      instance_id: selectedIp.instance_id,
      tags,
      schedule_enabled: scheduleEnabledTag,
    });
  };

  const handleCloseSuccess = () => {
    setUpdateStatus("idle");
    onClose();
  };

  const rowVariant = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22 } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: "background.paper",
          backgroundImage: "none",
        },
      }}
    >
      {updateStatus === "idle" && (
        <>
          <DialogTitle
            sx={{
              m: 0,
              p: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EventRepeatIcon sx={{ color: PRIMARY_ACCENT }} />
              <Typography variant="h6" component="div">
                Add/Update Tags
              </Typography>
            </Box>
            <IconButton aria-label="close" onClick={onClose} sx={tintedIconButtonSx(CLOSE_ACCENT)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ pt: 2.5, bgcolor: "background.paper" }}>
            {/* Region */}
            <Box sx={{ mb: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="modal-region-label">Select Region</InputLabel>
                <Select
                  labelId="modal-region-label"
                  label="Select Region"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <RoomOutlinedIcon sx={selectIconSx(REGION_ACCENT)} />
                      {selected}
                    </Box>
                  )}
                  sx={pillFieldSx(REGION_ACCENT)}
                  MenuProps={pillMenuProps(REGION_ACCENT)}
                >
                  {awsRegions.map((reg, i) => (
                    <MenuItem key={i} value={reg}>
                      {reg}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Instance (IP) */}
            <Box sx={{ mb: 1.5 }}>
              {loading ? (
                <Stack spacing={1}>
                  <Skeleton variant="rounded" height={38} />
                </Stack>
              ) : (
                <Autocomplete
                  options={ips}
                  getOptionLabel={(o) =>
                    o ? `${o.private_ip} (${o.instance_id})` : ""
                  }
                  isOptionEqualToValue={(o, v) =>
                    (o?.instance_id || "") === (v?.instance_id || "")
                  }
                  value={selectedIp}
                  onChange={(e, v) => setSelectedIp(v)}
                  slotProps={{ paper: pillAutocompletePaperProps(INSTANCE_ACCENT) }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Instance (IP)"
                      size="small"
                      placeholder={
                        ips.length ? "Search by IP…" : "No options for region"
                      }
                      sx={pillFieldSx(INSTANCE_ACCENT)}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <DnsOutlinedIcon sx={{ ...selectIconSx(INSTANCE_ACCENT), ml: 0.5 }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              )}
            </Box>

            {/* Tags */}
            {selectedIp && (
              <>
                {loadingTags ? (
                  <Stack spacing={1.25}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Stack
                        key={i}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <Skeleton variant="rounded" height={38} width="40%" />
                        <Skeleton variant="rounded" height={38} width="50%" />
                        <Skeleton variant="circular" height={32} width={32} />
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <>
                    <Box sx={{ mb: 1.25 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="schedule-enabled-modal-label">
                          Schedule Enabled
                        </InputLabel>
                        <Select
                          labelId="schedule-enabled-modal-label"
                          label="Schedule Enabled"
                          value={scheduleEnabledTag}
                          onChange={(e) =>
                            setScheduleEnabledTag(e.target.value)
                          }
                          renderValue={(selected) => (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <ToggleOnOutlinedIcon sx={selectIconSx(SCHEDULE_ACCENT)} />
                              {selected}
                            </Box>
                          )}
                          sx={pillFieldSx(SCHEDULE_ACCENT)}
                          MenuProps={pillMenuProps(SCHEDULE_ACCENT)}
                        >
                          <MenuItem value="true">true</MenuItem>
                          <MenuItem value="false">false</MenuItem>
                          <MenuItem value="not found">not found</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Typography
                      variant="subtitle1"
                      component="span"
                      sx={{ display: "block", mb: 1 }}
                    >
                      Define Tag(s)
                    </Typography>

                    <AnimatePresence initial={false}>
                      {tagEntries.map((entry, index) => (
                        <Stack
                          key={`row-${index}`}
                          component={motion.div}
                          variants={rowVariant}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          alignItems={{ xs: "stretch", sm: "center" }}
                          sx={{
                            p: 1,
                            mb: 1,
                            borderRadius: 2,
                            background:
                              theme.palette.mode === "light"
                                ? "rgba(25,118,210,0.05)"
                                : "rgba(144,202,249,0.06)",
                            border: "1px solid",
                            borderColor: theme.palette.divider,
                          }}
                        >
                          <FormControl sx={{ minWidth: 160 }} size="small">
                            <InputLabel id={`tag-select-label-${index}`}>
                              Tag
                            </InputLabel>
                            <Select
                              labelId={`tag-select-label-${index}`}
                              label="Tag"
                              value={entry.key}
                              onChange={(e) => {
                                const next = [...tagEntries];
                                next[index].key = e.target.value;
                                setTagEntries(next);
                              }}
                              renderValue={(selected) => (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                  <LabelOutlinedIcon sx={selectIconSx(TAG_ACCENT)} />
                                  {selected}
                                </Box>
                              )}
                              sx={pillFieldSx(TAG_ACCENT)}
                              MenuProps={pillMenuProps(TAG_ACCENT)}
                            >
                              {getAvailableTagOptions(tagEntries, index).map(
                                (opt, idx) => (
                                  <MenuItem key={idx} value={opt}>
                                    {opt}
                                  </MenuItem>
                                )
                              )}
                            </Select>
                          </FormControl>

                          <TextField
                            label="Cron Expression"
                            size="small"
                            value={entry.value}
                            onChange={(e) => {
                              const next = [...tagEntries];
                              next[index].value = e.target.value;
                              setTagEntries(next);
                            }}
                            placeholder="e.g. 30 12 * * 0-5"
                            fullWidth
                            sx={pillFieldSx(PRIMARY_ACCENT)}
                            InputProps={{
                              startAdornment: (
                                <EventRepeatIcon sx={{ ...selectIconSx(PRIMARY_ACCENT), mr: 0.75 }} />
                              ),
                            }}
                          />

                          <Tooltip title="Remove Tag">
                            <IconButton
                              size="small"
                              onClick={() => removeTagEntry(index)}
                              sx={tintedIconButtonSx(DELETE_ACCENT)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ))}
                    </AnimatePresence>

                    <Button
                      onClick={addTagEntry}
                      variant="outlined"
                      startIcon={<AddIcon fontSize="small" />}
                      sx={{
                        mt: 0.5,
                        borderRadius: 999,
                        textTransform: "none",
                        borderColor: `rgba(${hexToRgb(PRIMARY_ACCENT)}, 0.4)`,
                        color: PRIMARY_ACCENT,
                        "&:hover": {
                          borderColor: PRIMARY_ACCENT,
                          bgcolor: `rgba(${hexToRgb(PRIMARY_ACCENT)}, 0.08)`,
                        },
                      }}
                    >
                      Add Tag
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogContent>

          <DialogActions
            sx={{ px: 2, py: 1.5, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}
          >
            <Button
              onClick={onClose}
              sx={{ borderRadius: 999, textTransform: "none", color: "text.secondary" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              variant="contained"
              sx={{
                borderRadius: 999,
                textTransform: "none",
                bgcolor: PRIMARY_ACCENT,
                boxShadow: "none",
                "&:hover": { bgcolor: PRIMARY_ACCENT, filter: "brightness(0.92)", boxShadow: "none" },
              }}
            >
              Apply
            </Button>
          </DialogActions>
        </>
      )}

      {updateStatus === "loading" && (
        <Box
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Skeleton variant="circular" width={46} height={46} />
          <Typography variant="body1">Updating tags...</Typography>
        </Box>
      )}

      {updateStatus === "success" && (
        <>
          <DialogContent sx={{ textAlign: "center", py: 4 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 50, color: PRIMARY_ACCENT }} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Updated Successfully!
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              onClick={handleCloseSuccess}
              sx={{
                borderRadius: 999,
                textTransform: "none",
                bgcolor: PRIMARY_ACCENT,
                boxShadow: "none",
                "&:hover": { bgcolor: PRIMARY_ACCENT, filter: "brightness(0.92)", boxShadow: "none" },
              }}
            >
              OK
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

SchedulerAddTagsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SchedulerAddTagsModal;
