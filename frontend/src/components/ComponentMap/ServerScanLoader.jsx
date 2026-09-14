// src/components/ComponentMap/ServerScanLoader.jsx
import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import Ec2ArchIcon from "./Ec2ArchIcon";
import PropTypes from "prop-types";

const CAPTIONS = [
  "Scanning component hosts…",
  "Mapping upstream & downstream links…",
  "Building the flow graph…",
];
const CAPTION_DURATION = 3.4;
const LOOP_DURATION = 6.4;

// Waypoints the lens visits, in order (device positions on the 320x172 scene).
const HUB = { x: 160, y: 86 };
const NODES = [
  { key: "ec2-a", x: 40, y: 30 },
  { key: "ec2-b", x: 280, y: 30 },
  { key: "ec2-c", x: 280, y: 142 },
  { key: "ec2-d", x: 40, y: 142 },
];
const LENS_PATH = [...NODES.map((n) => n), NODES[0]];

const ServerScanLoader = ({ label }) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  const accent = isLight ? "#2563EB" : "#60A5FA";
  const accent2 = isLight ? "#22C55E" : "#34D399";
  const badgeFace = isLight
    ? "linear-gradient(180deg,#f8fafc,#e2e8f0)"
    : "linear-gradient(180deg,#334155,#1e293b)";
  const lineColor = isLight ? "rgba(100,116,139,0.55)" : "rgba(148,163,184,0.5)";
  const captions = label ? [label] : CAPTIONS;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 460,
        mx: "auto",
      }}
    >
      <Typography
        variant="overline"
        sx={{
          display: "block",
          mb: 1,
          fontWeight: 700,
          letterSpacing: 1,
          color: "text.secondary",
          textAlign: "center",
        }}
      >
        Building component map
      </Typography>

      <Box sx={{ position: "relative", width: 320, height: 172, mx: "auto" }}>
        {/* connectors from every device to the central hub, flowing toward it */}
        <svg width="320" height="172" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <marker id="scan-arrow" viewBox="0 -4 8 8" refX="7" refY="0" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,-4L8,0L0,4" fill={accent} />
            </marker>
          </defs>
          {NODES.map((n, i) => (
            <motion.line
              key={n.key}
              x1={n.x}
              y1={n.y}
              x2={HUB.x}
              y2={HUB.y}
              stroke={lineColor}
              strokeWidth="2"
              strokeDasharray="1 9"
              strokeLinecap="round"
              markerEnd="url(#scan-arrow)"
              animate={{ strokeDashoffset: [0, -20] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "linear", delay: i * 0.15 }}
            />
          ))}
        </svg>

        {/* central hub */}
        <Box
          component={motion.div}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            position: "absolute",
            left: HUB.x - 30,
            top: HUB.y - 30,
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: badgeFace,
            border: "2px solid",
            borderColor: accent,
            boxShadow: `0 0 10px ${accent}66`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HubRoundedIcon sx={{ fontSize: 30, color: accent }} />
        </Box>

        {/* connected devices, each glowing as the lens arrives */}
        {NODES.map((n, i) => {
          const delay = (i / NODES.length) * LOOP_DURATION;
          const tone = i % 2 ? accent2 : accent;
          return (
            <Box
              key={n.key}
              component={motion.div}
              initial={{ boxShadow: "none" }}
              animate={{
                boxShadow: ["none", `0 0 0 4px ${tone}55, 0 0 14px ${tone}aa`, "none"],
              }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                repeatDelay: LOOP_DURATION - 0.9,
                delay,
                ease: "easeOut",
              }}
              sx={{
                position: "absolute",
                left: n.x - 22,
                top: n.y - 22,
                width: 44,
                height: 44,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ec2ArchIcon size={40} />
            </Box>
          );
        })}

        {/* magnifying glass touring the network, node by node */}
        <Box
          component={motion.div}
          initial={{ left: LENS_PATH[0].x, top: LENS_PATH[0].y }}
          animate={{
            left: LENS_PATH.map((p) => p.x),
            top: LENS_PATH.map((p) => p.y),
          }}
          transition={{ duration: LOOP_DURATION, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            position: "absolute",
            width: 0,
            height: 0,
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            style={{ position: "absolute", left: -14, top: -38, overflow: "visible" }}
          >
            <defs>
              <radialGradient id="lensGlass" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={isLight ? 0.95 : 0.7} />
                <stop offset="45%" stopColor="#ffffff" stopOpacity={isLight ? 0.35 : 0.12} />
                <stop offset="100%" stopColor={accent} stopOpacity="0.25" />
              </radialGradient>
            </defs>
            <circle cx="26" cy="26" r="18" fill="url(#lensGlass)" stroke={accent} strokeWidth="5" />
            <circle cx="26" cy="26" r="18" fill="none" stroke={isLight ? "#fff" : "#0f172a"} strokeWidth="1.5" opacity="0.5" />
            <ellipse cx="19" cy="18" rx="6" ry="4" fill="#fff" opacity="0.7" />
            <line x1="39" y1="39" x2="54" y2="54" stroke={accent} strokeWidth="7" strokeLinecap="round" />
            <line x1="39" y1="39" x2="54" y2="54" stroke={isLight ? "#fff" : "#0f172a"} strokeWidth="7" strokeLinecap="round" opacity="0.15" />
          </svg>
        </Box>
      </Box>

      <Box sx={{ position: "relative", height: 22, mt: 0.5, textAlign: "center" }}>
        {captions.map((caption, i) => (
          <Typography
            key={caption}
            component={motion.div}
            variant="body2"
            color="text.secondary"
            initial={{ opacity: 0 }}
            animate={
              captions.length > 1
                ? { opacity: [0, 1, 1, 0] }
                : { opacity: [0.55, 1, 0.55] }
            }
            transition={
              captions.length > 1
                ? {
                    duration: CAPTION_DURATION,
                    repeat: Infinity,
                    repeatDelay: (captions.length - 1) * CAPTION_DURATION,
                    ease: "easeInOut",
                    times: [0, 0.1, 0.85, 1],
                    delay: i * CAPTION_DURATION,
                  }
                : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            }
            sx={{ position: "absolute", left: 0, right: 0 }}
          >
            {caption}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

ServerScanLoader.propTypes = {
  label: PropTypes.string,
};

export default ServerScanLoader;
