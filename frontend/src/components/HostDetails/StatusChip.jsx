import { forwardRef } from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import hexToRgb from "../shared/hexToRgb";

// Tinted icon pill, same visual language as the component breakdown chips
// (ComponentCountsBadge) - solid low-opacity fill of the status color with
// the icon and label in the full-strength color. When sx sets a fixed
// `width`, the label truncates with an ellipsis instead of stretching the
// pill, so a row of these chips stays the same length regardless of content.
//
// forwardRef + ...rest so this can be used as a Tooltip child: Tooltip
// clones its child and injects a ref plus mouse/focus handlers onto it -
// without forwarding both through, the tooltip silently never fires.
const StatusChip = forwardRef(function StatusChip(
  { label, color, Icon, onClick, sx, ...rest },
  ref
) {
  const rgb = hexToRgb(color);
  return (
    <Box
      ref={ref}
      onClick={onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        bgcolor: `rgba(${rgb}, 0.16)`,
        color,
        px: 1.25,
        py: 0.5,
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        ...(onClick && {
          cursor: "pointer",
          transition: "background-color 120ms ease",
          "&:hover": { bgcolor: `rgba(${rgb}, 0.28)` },
        }),
        ...sx,
      }}
      {...rest}
    >
      <Icon sx={{ fontSize: 16, flexShrink: 0 }} />
      <Box
        component="span"
        sx={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}
      >
        {label}
      </Box>
    </Box>
  );
});

StatusChip.propTypes = {
  label: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  Icon: PropTypes.elementType.isRequired,
  onClick: PropTypes.func,
  sx: PropTypes.object,
};

StatusChip.defaultProps = {
  onClick: undefined,
  sx: undefined,
};

export default StatusChip;
