import PropTypes from "prop-types";
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import CloseIcon from "@mui/icons-material/Close";

import StatusChip from "../HostDetails/StatusChip";
import hexToRgb from "../shared/hexToRgb";
import WatcherStatusDetailsPanel from "./WatcherStatusDetailsPanel";

const HEADER_ACCENT = "#FF6B35";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
});

function WatcherStatusDetailsModal({ component, componentLabel, error, loading, open, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: "85vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          py: 1.25,
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MonitorHeartRoundedIcon sx={{ color: HEADER_ACCENT, fontSize: 20 }} />
          <Typography variant="subtitle1" component="div" sx={{ fontWeight: 700 }}>
            Watcher Status Details
          </Typography>
          {(component?.name || componentLabel) && (
            <StatusChip
              label={component?.name || componentLabel}
              color={HEADER_ACCENT}
              Icon={MonitorHeartRoundedIcon}
            />
          )}
        </Box>
        <IconButton
          aria-label="close"
          size="small"
          onClick={onClose}
          sx={tintedIconButtonSx("#94A3B8")}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, bgcolor: "background.paper" }}>
        <WatcherStatusDetailsPanel comp={component} loading={loading} error={error} />
      </DialogContent>
    </Dialog>
  );
}

WatcherStatusDetailsModal.propTypes = {
  component: PropTypes.object,
  componentLabel: PropTypes.string,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  loading: PropTypes.bool,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

WatcherStatusDetailsModal.defaultProps = {
  component: null,
  componentLabel: "",
  error: null,
  loading: false,
};

export default WatcherStatusDetailsModal;
