import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import HealthInfo from "./HealthInfo";
import StatusChip from "../HostDetails/StatusChip";

function truncateMiddle(value, keep = 18) {
  if (!value) return "N/A";
  if (value.length <= keep * 2) return value;
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

function roleMeta(theme, role) {
  const light = theme.palette.mode === "light";
  const map = {
    primary: {
      label: "Primary",
      accent: light ? "#2563EB" : "#60A5FA",
      accentSoft: light ? alpha("#2563EB", 0.1) : alpha("#60A5FA", 0.14),
    },
    secondary: {
      label: "Secondary",
      accent: light ? "#DB2777" : "#FB7185",
      accentSoft: light ? alpha("#DB2777", 0.08) : alpha("#FB7185", 0.12),
    },
    unknown: {
      label: "Unknown",
      accent: light ? "#64748B" : "#94A3B8",
      accentSoft: light ? alpha("#64748B", 0.08) : alpha("#94A3B8", 0.12),
    },
  };
  return map[role] || map.unknown;
}

function DiagramNode({ title, subtitle, accent, icon }) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: alpha(accent, 0.65),
        background: (theme) =>
          `linear-gradient(180deg, ${alpha(accent, theme.palette.mode === "light" ? 0.1 : 0.16)}, ${alpha(theme.palette.background.paper, 0.96)})`,
        boxShadow: `0 12px 30px ${alpha(accent, 0.16)}`,
        textAlign: "center",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 0.75 }}>
        <Box sx={{ display: "inline-flex", color: accent }}>{icon}</Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ fontWeight: 900, fontSize: "1.05rem", wordBreak: "break-word" }}>
        {subtitle}
      </Typography>
    </Box>
  );
}

function BranchCard({ role, record, active, statusLoading = false }) {
  const theme = useTheme();
  const meta = roleMeta(theme, role);

  if (!record) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          border: "1px dashed",
          borderColor: "divider",
          backgroundColor: alpha(theme.palette.background.paper, 0.56),
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.4 }}>
          {meta.label}
        </Typography>
        <Typography color="text.secondary">No failover record found.</Typography>
      </Box>
    );
  }

  return (
    <Box
      component={motion.div}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: active ? alpha(meta.accent, 0.65) : "divider",
        background: active
          ? `linear-gradient(180deg, ${meta.accentSoft}, ${alpha(theme.palette.background.paper, 0.96)})`
          : alpha(theme.palette.background.paper, 0.72),
        boxShadow: active ? `0 14px 34px ${alpha(meta.accent, 0.18)}` : "none",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.35 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: meta.accent,
              boxShadow: `0 0 14px ${alpha(meta.accent, 0.45)}`,
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {meta.label}
          </Typography>
        </Stack>
        <StatusChip
          label={active ? "Traffic flowing" : "Standby"}
          color={active ? meta.accent : "#94A3B8"}
          Icon={active ? CheckCircleRoundedIcon : RadioButtonUncheckedRoundedIcon}
        />
      </Stack>

      <Stack spacing={0.9}>
        <Typography><strong>Alias:</strong> {truncateMiddle(record.alias_target, 16)}</Typography>
        <Typography><strong>Location:</strong> {record.location}</Typography>
        <Typography><strong>DNS:</strong> {record.dns_name}</Typography>
      </Stack>

      <Box sx={{ mt: 1.8 }}>
        <HealthInfo
          record={
            statusLoading ? { ...record, health_status: "Checking..." } : record
          }
          active={active}
          label={meta.label}
        />
      </Box>
    </Box>
  );
}

function buildBranchPath(split, end) {
  if (!split || !end) return "";

  return [
    `M ${split.x} ${split.y}`,
    `C ${split.x} ${split.y + 44} ${end.x} ${split.y + 44} ${end.x} ${end.y}`,
  ].join(" ");
}

function buildTrunkPath(start, split) {
  if (!start || !split) return "";

  return `M ${start.x} ${start.y} L ${split.x} ${split.y}`;
}

function TreeOverlay({ activeRole, primaryAccent, secondaryAccent, paths, width, height }) {
  const activeAccent =
    activeRole === "primary"
      ? primaryAccent
      : activeRole === "secondary"
        ? secondaryAccent
        : "#94A3B8";

  const baseStroke = "rgba(148, 163, 184, 0.22)";
  const primaryActive = activeRole === "primary";
  const secondaryActive = activeRole === "secondary";
  const packetRadius = 5.5;
  const packetRadiusMid = 4;
  const packetRadiusSmall = 3;
  const splitNodeFill =
    activeRole === "primary"
      ? primaryAccent
      : activeRole === "secondary"
        ? secondaryAccent
        : "rgba(148, 163, 184, 0.55)";

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <svg
        viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <filter id="route53-packet-glow" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {paths.trunk ? (
          <path d={paths.trunk} stroke={baseStroke} strokeWidth="4" fill="none" strokeLinecap="round" />
        ) : null}
        {paths.topToPrimary ? (
          <path d={paths.topToPrimary} stroke={baseStroke} strokeWidth="4" fill="none" strokeLinecap="round" />
        ) : null}
        {paths.topToSecondary ? (
          <path d={paths.topToSecondary} stroke={baseStroke} strokeWidth="4" fill="none" strokeLinecap="round" />
        ) : null}
        {paths.splitPoint ? (
          <circle
            cx={paths.splitPoint.x}
            cy={paths.splitPoint.y}
            r="5"
            fill={splitNodeFill}
            opacity="0.9"
            style={{ filter: "drop-shadow(0 0 6px rgba(96, 165, 250, 0.45))" }}
          />
        ) : null}
        {paths.primaryEnd ? (
          <circle cx={paths.primaryEnd.x} cy={paths.primaryEnd.y} r="4.5" fill={baseStroke} />
        ) : null}
        {paths.secondaryEnd ? (
          <circle cx={paths.secondaryEnd.x} cy={paths.secondaryEnd.y} r="4.5" fill={baseStroke} />
        ) : null}

        {primaryActive && paths.trunk && paths.topToPrimary ? (
          <>
            <path
              d={paths.trunk}
              stroke={primaryAccent}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${primaryAccent})` }}
            />
            <path
              d={paths.topToPrimary}
              stroke={primaryAccent}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${primaryAccent})` }}
            />
            {paths.primaryEnd ? (
              <circle
                cx={paths.primaryEnd.x}
                cy={paths.primaryEnd.y}
                r="5"
                fill={primaryAccent}
                filter="url(#route53-packet-glow)"
              />
            ) : null}
            <circle r={packetRadius} fill={primaryAccent} filter="url(#route53-packet-glow)">
              <animateMotion dur="1.4s" repeatCount="indefinite" path={paths.trunk} />
            </circle>
            <circle r={packetRadiusMid} fill={primaryAccent} opacity="0.82" filter="url(#route53-packet-glow)">
              <animateMotion dur="1.4s" begin="0.3s" repeatCount="indefinite" path={paths.trunk} />
            </circle>
            <circle r={packetRadiusSmall} fill={primaryAccent} opacity="0.62" filter="url(#route53-packet-glow)">
              <animateMotion dur="1.4s" begin="0.6s" repeatCount="indefinite" path={paths.trunk} />
            </circle>
            <circle r={packetRadius} fill={primaryAccent} filter="url(#route53-packet-glow)">
              <animateMotion dur="1.6s" repeatCount="indefinite" path={paths.topToPrimary} />
            </circle>
            <circle r={packetRadiusMid} fill={primaryAccent} opacity="0.82" filter="url(#route53-packet-glow)">
              <animateMotion dur="1.6s" begin="0.36s" repeatCount="indefinite" path={paths.topToPrimary} />
            </circle>
            <circle r={packetRadiusSmall} fill={primaryAccent} opacity="0.62" filter="url(#route53-packet-glow)">
              <animateMotion dur="1.6s" begin="0.72s" repeatCount="indefinite" path={paths.topToPrimary} />
            </circle>
          </>
        ) : null}

        {secondaryActive && paths.trunk && paths.topToSecondary ? (
          <>
            <path
              d={paths.trunk}
              stroke={secondaryAccent}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${secondaryAccent})` }}
            />
            <path
              d={paths.topToSecondary}
              stroke={secondaryAccent}
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${secondaryAccent})` }}
            />
            {paths.secondaryEnd ? (
              <circle
                cx={paths.secondaryEnd.x}
                cy={paths.secondaryEnd.y}
                r="5"
                fill={secondaryAccent}
                filter="url(#route53-packet-glow)"
              />
            ) : null}
            <circle r={packetRadius} fill={secondaryAccent} filter="url(#route53-packet-glow)">
              <animateMotion dur="1.4s" repeatCount="indefinite" path={paths.trunk} />
            </circle>
            <circle r={packetRadiusMid} fill={secondaryAccent} opacity="0.82" filter="url(#route53-packet-glow)">
              <animateMotion dur="1.4s" begin="0.3s" repeatCount="indefinite" path={paths.trunk} />
            </circle>
            <circle r={packetRadiusSmall} fill={secondaryAccent} opacity="0.62" filter="url(#route53-packet-glow)">
              <animateMotion dur="1.4s" begin="0.6s" repeatCount="indefinite" path={paths.trunk} />
            </circle>
            <circle r={packetRadius} fill={secondaryAccent} filter="url(#route53-packet-glow)">
              <animateMotion dur="1.6s" repeatCount="indefinite" path={paths.topToSecondary} />
            </circle>
            <circle r={packetRadiusMid} fill={secondaryAccent} opacity="0.82" filter="url(#route53-packet-glow)">
              <animateMotion dur="1.6s" begin="0.36s" repeatCount="indefinite" path={paths.topToSecondary} />
            </circle>
            <circle r={packetRadiusSmall} fill={secondaryAccent} opacity="0.62" filter="url(#route53-packet-glow)">
              <animateMotion dur="1.6s" begin="0.72s" repeatCount="indefinite" path={paths.topToSecondary} />
            </circle>
          </>
        ) : null}

        {activeRole !== "primary" && activeRole !== "secondary" && paths.trunk ? (
          <path
            d={paths.trunk}
            stroke={activeAccent}
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${activeAccent})` }}
          />
        ) : null}
      </svg>
    </Box>
  );
}

function ZoneCard({ zone }) {
  const theme = useTheme();
  const treeRef = useRef(null);
  const topNodeRef = useRef(null);
  const primaryRef = useRef(null);
  const secondaryRef = useRef(null);
  const [overlay, setOverlay] = useState({
    width: 0,
    height: 0,
    paths: {},
  });
  const isStatusLoading = Boolean(zone.status_loading);
  const activeRole = zone.active_target || "unknown";
  const resolvedActiveRole = isStatusLoading ? "unknown" : activeRole;
  const primaryMeta = roleMeta(theme, "primary");
  const secondaryMeta = roleMeta(theme, "secondary");
  const activeMeta = roleMeta(theme, resolvedActiveRole);
  const activeRecord =
    resolvedActiveRole === "primary"
      ? zone.primary
      : resolvedActiveRole === "secondary"
        ? zone.secondary
        : null;

  useLayoutEffect(() => {
    const container = treeRef.current;
    if (!container) return undefined;

    const measure = () => {
      const rootRect = container.getBoundingClientRect();
      const topRect = topNodeRef.current?.getBoundingClientRect();
      const primaryRect = primaryRef.current?.getBoundingClientRect();
      const secondaryRect = secondaryRef.current?.getBoundingClientRect();

      const relativePoint = (rect, xRatio, yRatio) =>
        rect
          ? {
              x: rect.left - rootRect.left + rect.width * xRatio,
              y: rect.top - rootRect.top + rect.height * yRatio,
            }
          : null;

      const topExit = relativePoint(topRect, 0.5, 1);
      const primaryEntryRaw = relativePoint(primaryRect, 0.5, 0);
      const secondaryEntryRaw = relativePoint(secondaryRect, 0.5, 0);
      const borderOffset = 6;
      const primaryEntry = primaryEntryRaw
        ? { x: primaryEntryRaw.x, y: primaryEntryRaw.y - borderOffset }
        : null;
      const secondaryEntry = secondaryEntryRaw
        ? { x: secondaryEntryRaw.x, y: secondaryEntryRaw.y - borderOffset }
        : null;
      const minEntryY = Math.min(primaryEntry?.y || 0, secondaryEntry?.y || 0);
      const splitPoint =
        topExit && minEntryY
          ? {
              x: topExit.x,
              y: topExit.y + Math.max(52, Math.min(104, (minEntryY - topExit.y) * 0.38)),
            }
          : null;

      setOverlay({
        width: rootRect.width,
        height: rootRect.height,
        paths: {
          trunk: buildTrunkPath(topExit, splitPoint),
          topToPrimary: buildBranchPath(splitPoint, primaryEntry),
          topToSecondary: buildBranchPath(splitPoint, secondaryEntry),
          splitPoint,
          primaryEnd: primaryEntry,
          secondaryEnd: secondaryEntry,
        },
      });
    };

    const rafMeasure = () => window.requestAnimationFrame(measure);
    rafMeasure();

    const resizeObserver = new ResizeObserver(rafMeasure);
    resizeObserver.observe(container);
    [topNodeRef.current, primaryRef.current, secondaryRef.current]
      .filter(Boolean)
      .forEach((node) => resizeObserver.observe(node));

    window.addEventListener("resize", rafMeasure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", rafMeasure);
    };
  }, [zone, resolvedActiveRole]);

  useEffect(() => {
    if (!document?.fonts?.ready) return undefined;

    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) {
        window.dispatchEvent(new Event("resize"));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card
      elevation={0}
      sx={{
        mb: 3,
        overflow: "hidden",
        borderRadius: 2.25,
        border: "1px solid",
        borderColor: alpha(activeMeta.accent, 0.2),
        background: `radial-gradient(circle at top center, ${alpha(activeMeta.accent, theme.palette.mode === "light" ? 0.1 : 0.14)}, transparent 30%), ${alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 0.95 : 0.88)}`,
        boxShadow: `0 22px 54px ${alpha(theme.palette.common.black, theme.palette.mode === "light" ? 0.08 : 0.26)}`,
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2.1,
          borderBottom: "1px solid",
          borderColor: alpha(activeMeta.accent, 0.15),
          background: `linear-gradient(180deg, ${alpha(activeMeta.accent, theme.palette.mode === "light" ? 0.08 : 0.12)}, transparent)`,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography sx={{ fontSize: { xs: "1.55rem", md: "1.85rem" }, fontWeight: 900, letterSpacing: "-0.03em" }}>
              {zone.hosted_zone}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.35 }}>
              Main URL: {zone.main_url}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <StatusChip
              label={isStatusLoading ? "Syncing live path" : `Live Path: ${activeMeta.label}`}
              color={isStatusLoading ? "#94A3B8" : activeMeta.accent}
              Icon={isStatusLoading ? SyncRoundedIcon : CheckCircleRoundedIcon}
            />
            <StatusChip
              label={
                isStatusLoading
                  ? "Checking latest route..."
                  : zone.active_location || activeRecord?.location || "Unknown"
              }
              color={isStatusLoading ? "#94A3B8" : activeMeta.accent}
              Icon={PlaceRoundedIcon}
            />
          </Stack>
        </Stack>
      </Box>

      <CardContent sx={{ p: 2.5 }}>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 1.4,
            color: "text.secondary",
            letterSpacing: "0.14em",
            fontWeight: 800,
          }}
        >
          LIVE ROUTING TREE
        </Typography>

        <Box ref={treeRef} sx={{ maxWidth: 1120, mx: "auto", position: "relative" }}>
          <TreeOverlay
            activeRole={resolvedActiveRole}
            primaryAccent={primaryMeta.accent}
            secondaryAccent={secondaryMeta.accent}
            paths={overlay.paths}
            width={overlay.width}
            height={overlay.height}
          />

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Box ref={topNodeRef} sx={{ maxWidth: 460, mx: "auto", mb: 18 }}>
              <DiagramNode
                title="Public URL"
                subtitle={zone.hosted_zone}
                accent={theme.palette.info.main}
                icon={<PublicRoundedIcon />}
              />
            </Box>

            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={2}
              alignItems="stretch"
              sx={{ mt: 10, pb: 1 }}
            >
              <Box ref={primaryRef} sx={{ flex: 1 }}>
                <BranchCard
                  role="primary"
                  record={zone.primary}
                  active={resolvedActiveRole === "primary"}
                  statusLoading={isStatusLoading}
                />
              </Box>
              <Box ref={secondaryRef} sx={{ flex: 1 }}>
                <BranchCard
                  role="secondary"
                  record={zone.secondary}
                  active={resolvedActiveRole === "secondary"}
                  statusLoading={isStatusLoading}
                />
              </Box>
            </Stack>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

DiagramNode.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  accent: PropTypes.string.isRequired,
  icon: PropTypes.node,
};

BranchCard.propTypes = {
  role: PropTypes.oneOf(["primary", "secondary"]).isRequired,
  record: PropTypes.shape({
    dns_name: PropTypes.string,
    alias_target: PropTypes.string,
    location: PropTypes.string,
    health_check_id: PropTypes.string,
    health_status: PropTypes.string,
  }),
  active: PropTypes.bool,
  statusLoading: PropTypes.bool,
};

TreeOverlay.propTypes = {
  activeRole: PropTypes.string,
  primaryAccent: PropTypes.string.isRequired,
  secondaryAccent: PropTypes.string.isRequired,
  paths: PropTypes.shape({
    trunk: PropTypes.string,
    topToPrimary: PropTypes.string,
    topToSecondary: PropTypes.string,
    splitPoint: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
    }),
    primaryEnd: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
    }),
    secondaryEnd: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
    }),
  }).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};

ZoneCard.propTypes = {
  zone: PropTypes.shape({
    hosted_zone: PropTypes.string.isRequired,
    main_url: PropTypes.string.isRequired,
    primary: PropTypes.object,
    secondary: PropTypes.object,
    status_loading: PropTypes.bool,
    active_target: PropTypes.string,
    active_alias_target: PropTypes.string,
    active_location: PropTypes.string,
    routing_reason: PropTypes.string,
  }).isRequired,
};

export default ZoneCard;
