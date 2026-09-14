import PropTypes from "prop-types";
import { Box, Tooltip, Typography } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BuildIcon from "@mui/icons-material/Build";
import BoltIcon from "@mui/icons-material/Bolt";
import WidgetsIcon from "@mui/icons-material/Widgets";
import hexToRgb from "../shared/hexToRgb";

function IconChip({ label, color, value, Icon }) {
  const rgb = hexToRgb(color);
  return (
    <Tooltip title={label}>
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          bgcolor: `rgba(${rgb}, 0.16)`,
          color,
          px: 1,
          py: 0.25,
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.6,
        }}
      >
        <Icon sx={{ fontSize: 14 }} />
        <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: "inherit" }}>
          {Number(value ?? 0)}
        </Typography>
      </Box>
    </Tooltip>
  );
}

IconChip.propTypes = {
  label: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  value: PropTypes.number,
  Icon: PropTypes.elementType.isRequired,
};

const CATEGORY_SEGMENTS = [
  { key: "tool", label: "Tools", color: "#F59E0B", icon: BuildIcon },
  { key: "job", label: "Jobs", color: "#A78BFA", icon: BoltIcon },
  { key: "component", label: "Components", color: "#60A5FA", icon: WidgetsIcon },
];

// Compact breakdown of a host's components: watcher-configured coverage
// as its own chip, with the by-category counts (tool/job/component)
// grouped into one pill. Rows in this table are single-line (the table
// scrolls horizontally instead of wrapping), so this stays on one line too.
export default function ComponentCountsBadge({ watcherConfigured, tool, job, component }) {
  const values = { tool, job, component };

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "nowrap",
        justifyContent: "center",
      }}
    >
      <IconChip label="Watcher Configured" color="#34D399" value={watcherConfigured} Icon={VisibilityIcon} />

      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          border: "1px solid rgba(148, 163, 184, 0.3)",
          borderRadius: 999,
          px: 1,
          py: 0.25,
        }}
      >
        {CATEGORY_SEGMENTS.map((segment) => (
          <IconChip
            key={segment.key}
            label={segment.label}
            color={segment.color}
            value={values[segment.key]}
            Icon={segment.icon}
          />
        ))}
      </Box>
    </Box>
  );
}

ComponentCountsBadge.propTypes = {
  watcherConfigured: PropTypes.number,
  tool: PropTypes.number,
  job: PropTypes.number,
  component: PropTypes.number,
};

ComponentCountsBadge.defaultProps = {
  watcherConfigured: 0,
  tool: 0,
  job: 0,
  component: 0,
};
