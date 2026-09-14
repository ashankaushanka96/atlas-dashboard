import React from "react";
import PropTypes from "prop-types";
import { alpha, Box } from "@mui/material";
import RoomRoundedIcon from "@mui/icons-material/RoomRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import LabelRoundedIcon from "@mui/icons-material/LabelRounded";

const SEGMENTS = [
  { key: "region", color: "#60A5FA", Icon: RoomRoundedIcon },
  { key: "ip", color: "#A78BFA", Icon: LanguageRoundedIcon },
  { key: "name", color: "#34D399", Icon: LabelRoundedIcon },
];

// Compact segmented "tablet" chip - one rounded pill split into
// region / ip / component-name sections, each tinted its own accent color,
// used in place of a plain "region | ip | name" text line.
export default function MetaPill({ region, ip, name, size = "medium" }) {
  const values = { region, ip, name };
  const active = SEGMENTS.filter((segment) => values[segment.key]);
  if (!active.length) return null;

  const compact = size === "small";

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "stretch",
        borderRadius: 999,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        maxWidth: "100%",
      }}
    >
      {active.map((segment, index) => (
        <Box
          key={segment.key}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.4,
            px: compact ? 0.9 : 1.1,
            py: compact ? 0.25 : 0.35,
            fontSize: compact ? 10.5 : 11.5,
            fontWeight: 600,
            color: segment.color,
            bgcolor: alpha(segment.color, 0.14),
            borderLeft: index === 0 ? "none" : "1px solid",
            borderColor: "divider",
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <segment.Icon sx={{ fontSize: compact ? 12 : 13, flexShrink: 0 }} />
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {values[segment.key]}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

MetaPill.propTypes = {
  region: PropTypes.string,
  ip: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(["small", "medium"]),
};
