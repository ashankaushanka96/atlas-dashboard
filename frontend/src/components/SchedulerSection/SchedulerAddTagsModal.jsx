import { useState, useEffect } from "react";
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
  CircularProgress,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { backendDomain } from "../../Config";
import PropTypes from "prop-types";
import { useData } from "../../DataContext";
import axios from "axios";

// Static list of tag options for start/stop time tags.
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

// Helper: returns available tag options for a row by removing options already selected in other rows.
const getAvailableTagOptions = (tagEntries, currentIndex) => {
  const selectedKeys = tagEntries
    .filter((_, idx) => idx !== currentIndex)
    .map((entry) => entry.key)
    .filter(Boolean);
  return TAG_OPTIONS.filter(
    (option) =>
      !selectedKeys.includes(option) || tagEntries[currentIndex].key === option
  );
};

const SchedulerModal = ({ open, onClose }) => {
  const [ips, setIps] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("idle");

  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedIp, setSelectedIp] = useState(null);
  const [tagEntries, setTagEntries] = useState([]);
  const [scheduleEnabledTag, setScheduleEnabledTag] = useState("not found");

  const { awsRegions, awsIPs, loading } = useData();

  useEffect(() => {
    if (awsRegions.length > 0) {
      setSelectedRegion(awsRegions[0]);
    }
  }, [awsRegions]);

  useEffect(() => {
    setIps(awsIPs[selectedRegion] || []);
    setSelectedIp(null);
  }, [selectedRegion]);

  const fetchExistingInstanceTages = async () => {
    setLoadingTags(true);
    const url = `${backendDomain}/schedules/fetch-existing-instance-tags`;
    try {
      const response = await axios.get(url, {
        params: {
          region: selectedRegion,
          instance_id: selectedIp.instance_id,
        },
      });
      const fetchedTags = response.data.tags || [];
      // Extract schedule_enabled tag.
      const sched = response.data.schedule_enabled || "not found";
      setScheduleEnabledTag(sched ? sched : "not found");
      // Remove schedule_enabled tag from the tag entries.
      setTagEntries(
        fetchedTags.filter((tag) => tag.key !== "schedule_enabled")
      );
      setLoadingTags(false);
    } catch (err) {
      console.error(err);
      setLoadingTags(false);
    }
  };

  useEffect(() => {
    if (selectedRegion && selectedIp) {
      fetchExistingInstanceTages();
    } else {
      setTagEntries([]);
      setScheduleEnabledTag("not found");
    }
  }, [selectedIp, selectedRegion]);

  // Handler to add a new tag entry.
  const addTagEntry = () => {
    setTagEntries([...tagEntries, { key: "", value: "" }]);
  };

  // Handler to remove a tag entry.
  const removeTagEntry = (index) => {
    setTagEntries(tagEntries.filter((_, i) => i !== index));
  };

  const updateInstanceTags = async (payload) => {
    const url = `${backendDomain}/schedules/update-instance-tags`;
    try {
      const response = await axios.post(url, payload);
      setUpdateStatus("success");
      console.log(response.data);
    } catch (err) {
      console.error(err);
      alert("Error updating tags");
      setUpdateStatus("idle");
    }
  };

  // Handler for applying the tags.
  const handleApply = () => {
    if (!selectedIp || !selectedIp.instance_id) {
      alert("Please select a valid instance (IP).");
      return;
    }
    // Validate each tag entry.
    for (const entry of tagEntries) {
      if (!entry.key || !entry.value) {
        alert("Please fill out all tag entries.");
        return;
      }
    }
    setUpdateStatus("loading");
    // Prepare the start/stop tags.
    const tags = tagEntries.map((entry) => ({
      key: entry.key,
      value: entry.value,
    }));
    // Add the schedule_enabled tag.
    tags.push({ key: "schedule_enabled", value: scheduleEnabledTag });
    const payload = {
      region: selectedRegion,
      instance_id: selectedIp.instance_id,
      tags: tags,
      schedule_enabled: scheduleEnabledTag,
    };

    updateInstanceTags(payload);
  };

  const handleCloseSuccess = () => {
    setUpdateStatus("idle");
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        {updateStatus === "idle" && (
          <>
            <DialogTitle>Add/Update Tags</DialogTitle>
            <DialogContent dividers>
              {/* Region Select */}
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="modal-region-label">Select Region</InputLabel>
                  <Select
                    labelId="modal-region-label"
                    label="Select Region"
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                  >
                    {awsRegions.map((reg, index) => (
                      <MenuItem key={index} value={reg}>
                        {reg}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              {/* Autocomplete for Instance (IP) */}
              <Box sx={{ mb: 2 }}>
                {loading ? (
                  <Typography variant="body2">Loading IPs...</Typography>
                ) : (
                  <Autocomplete
                    options={ips}
                    getOptionLabel={(option) =>
                      `${option.private_ip} (${option.instance_id})`
                    }
                    value={selectedIp}
                    onChange={(e, newValue) => setSelectedIp(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Instance (IP)"
                        variant="outlined"
                      />
                    )}
                  />
                )}
              </Box>
              {/* Instance Tags Section: Only display when an IP is selected */}
              {selectedIp && (
                <>
                  {loadingTags ? (
                    <Box
                      sx={{ display: "flex", justifyContent: "center", mb: 2 }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <>
                      {/* Editable Schedule Enabled Tag */}
                      <Box sx={{ mb: 2 }}>
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
                          >
                            <MenuItem value="true">true</MenuItem>
                            <MenuItem value="false">false</MenuItem>
                            <MenuItem value="not found">not found</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      {/* Tag Entries */}
                      <Box>
                        <Typography variant="subtitle1" gutterBottom>
                          Define Tag(s)
                        </Typography>
                        {tagEntries.map((entry, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: "flex",
                              gap: 2,
                              mb: 1,
                              alignItems: "center",
                            }}
                          >
                            <FormControl sx={{ minWidth: 150 }} size="small">
                              <InputLabel id={`tag-select-label-${index}`}>
                                Tag
                              </InputLabel>
                              <Select
                                labelId={`tag-select-label-${index}`}
                                label="Key"
                                value={entry.key}
                                onChange={(e) => {
                                  const newEntries = [...tagEntries];
                                  newEntries[index].key = e.target.value;
                                  setTagEntries(newEntries);
                                }}
                              >
                                {getAvailableTagOptions(tagEntries, index).map(
                                  (option, idx) => (
                                    <MenuItem key={idx} value={option}>
                                      {option}
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
                                const newEntries = [...tagEntries];
                                newEntries[index].value = e.target.value;
                                setTagEntries(newEntries);
                              }}
                              placeholder="e.g. 30 12 * * 0-5"
                            />
                            {tagEntries.length > 0 && (
                              <IconButton onClick={() => removeTagEntry(index)}>
                                <Tooltip title="Remove Tag">
                                  <DeleteIcon />
                                </Tooltip>
                              </IconButton>
                            )}
                          </Box>
                        ))}
                        <Box
                          sx={{
                            mt: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <IconButton onClick={addTagEntry}>
                            <Tooltip title="Add Tag">
                              <AddIcon />
                            </Tooltip>
                          </IconButton>
                        </Box>
                      </Box>
                    </>
                  )}
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} color="inherit">
                Cancel
              </Button>
              <Button onClick={handleApply} variant="contained">
                Apply
              </Button>
            </DialogActions>
          </>
        )}
        {updateStatus === "loading" && (
          <Box
            sx={{
              padding: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography variant="body1">Updating tags...</Typography>
          </Box>
        )}
        {updateStatus === "success" && (
          <>
            <DialogContent sx={{ textAlign: "center", padding: "20px" }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 50, color: "green" }} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Updated Successfully!
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button variant="contained" onClick={handleCloseSuccess}>
                OK
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

SchedulerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SchedulerModal;
