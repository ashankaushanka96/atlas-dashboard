import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Skeleton,
  IconButton,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import PropTypes from "prop-types";
import { useData } from "../../DataContext";
import { API } from "../../services/auth";
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

const PRIMARY_ACCENT = "#F59E0B";
const REGION_ACCENT = "#60A5FA";
const CLOSE_ACCENT = "#94A3B8";

const SchedulerLambdaModal = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { awsRegions } = useData();
  const [selectedRegion, setSelectedRegion] = useState(awsRegions[0] || "");

  const handleRunLambda = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      await API.post(`/schedules/run-lambda`, null, {
        params: { region: selectedRegion },
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Error executing lambda");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLoading(false);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
          <CloudQueueIcon sx={{ color: PRIMARY_ACCENT }} />
          <Typography variant="h6" component="div">
            Run Lambda Function
          </Typography>
        </Box>
        <IconButton aria-label="close" onClick={handleClose} sx={tintedIconButtonSx(CLOSE_ACCENT)}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "background.paper" }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              py: 4,
            }}
          >
            <Skeleton variant="circular" width={46} height={46} />
            <Typography variant="body1">Executing lambda...</Typography>
          </Box>
        ) : success ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              py: 4,
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 50, color: PRIMARY_ACCENT }} />
            <Typography variant="h6">Execution Successful!</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="lambda-region-label">Select Region</InputLabel>
                <Select
                  labelId="lambda-region-label"
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
                  {awsRegions.map((reg, index) => (
                    <MenuItem key={index} value={reg}>
                      {reg}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="body2">
                Click <b>RUN LAMBDA</b> to execute the function for the selected
                region.
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}>
        {!loading && !success && (
          <>
            <Button
              onClick={handleClose}
              sx={{ borderRadius: 999, textTransform: "none", color: "text.secondary" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRunLambda}
              variant="contained"
              sx={{
                borderRadius: 999,
                textTransform: "none",
                bgcolor: PRIMARY_ACCENT,
                boxShadow: "none",
                "&:hover": { bgcolor: PRIMARY_ACCENT, filter: "brightness(0.92)", boxShadow: "none" },
              }}
            >
              Run Lambda
            </Button>
          </>
        )}
        {loading || success ? (
          <Button
            onClick={handleClose}
            variant="contained"
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
        ) : null}
      </DialogActions>
    </Dialog>
  );
};

SchedulerLambdaModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
export default SchedulerLambdaModal;
