import { useMemo } from "react";
import { Box, Chip, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import hexToRgb from "../shared/hexToRgb";

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeDonutArc(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  onItemClick,
}) {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  const total = segments.reduce((sum, item) => sum + item.value, 0);

  const arcSegments = useMemo(() => {
    if (!total) return [];
    let current = 0;
    return segments.map((segment) => {
      const angle = (segment.value / total) * 360;
      const start = current;
      const end = current + angle;
      current = end;
      return {
        ...segment,
        startAngle: start,
        endAngle: end,
        path: describeDonutArc(100, 100, 92, 58, start, end),
      };
    });
  }, [segments, total]);

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="center">
      <Box
        sx={{
          position: "relative",
          width: 178,
          height: 178,
          flexShrink: 0,
        }}
      >
        <Box
          component="svg"
          viewBox="0 0 200 200"
          sx={{
            width: "100%",
            height: "100%",
            overflow: "visible",
            filter: "drop-shadow(0 0 0 rgba(0,0,0,0))",
          }}
        >
          {!arcSegments.length ? (
            <circle
              cx="100"
              cy="100"
              r="75"
              fill="none"
              stroke={isLight ? "rgba(148,163,184,0.30)" : "rgba(148,163,184,0.2)"}
              strokeWidth="34"
            />
          ) : null}
          {arcSegments.map((segment) => (
            <Tooltip
              key={`${segment.label}-${segment.rawValue || segment.label}`}
              title={`${segment.label}: ${segment.value} (${Math.round(
                (segment.value / total) * 100
              )}%)`}
              arrow
            >
              {arcSegments.length === 1 ? (
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="34"
                  onClick={onItemClick ? () => onItemClick(segment) : undefined}
                  onKeyDown={
                    onItemClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onItemClick(segment);
                          }
                        }
                      : undefined
                  }
                  role={onItemClick ? "button" : undefined}
                  tabIndex={onItemClick ? 0 : undefined}
                  style={{
                    cursor: onItemClick ? "pointer" : "default",
                    transformOrigin: "100px 100px",
                    transition: "transform 150ms ease, filter 150ms ease, opacity 180ms ease",
                  }}
                  onMouseEnter={(event) => {
                    if (onItemClick) {
                      event.currentTarget.style.transform = "scale(1.03)";
                      event.currentTarget.style.filter = "brightness(1.08)";
                    }
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = "scale(1)";
                    event.currentTarget.style.filter = "brightness(1)";
                  }}
                />
              ) : (
                <path
                  d={segment.path}
                  fill={segment.color}
                  onClick={onItemClick ? () => onItemClick(segment) : undefined}
                  onKeyDown={
                    onItemClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onItemClick(segment);
                          }
                        }
                      : undefined
                  }
                  role={onItemClick ? "button" : undefined}
                  tabIndex={onItemClick ? 0 : undefined}
                  style={{
                    cursor: onItemClick ? "pointer" : "default",
                    transformOrigin: "100px 100px",
                    transition: "transform 150ms ease, filter 150ms ease, opacity 180ms ease",
                  }}
                  onMouseEnter={(event) => {
                    if (onItemClick) {
                      event.currentTarget.style.transform = "scale(1.03)";
                      event.currentTarget.style.filter = "brightness(1.08)";
                    }
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = "scale(1)";
                    event.currentTarget.style.filter = "brightness(1)";
                  }}
                />
              )}
            </Tooltip>
          ))}
        </Box>
        <Box
          sx={{
            position: "absolute",
            inset: 34,
            borderRadius: "50%",
            background: isLight ? "rgba(255,255,255,0.98)" : "rgba(15,23,42,0.96)",
            border: isLight
              ? "1px solid rgba(148,163,184,0.18)"
              : "1px solid rgba(148,163,184,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            textAlign: "center",
            px: 1.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {centerLabel}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            {centerValue}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={1.25} sx={{ width: "100%" }}>
        {segments.map((segment) => (
          <Stack
            key={segment.label}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            onClick={onItemClick ? () => onItemClick(segment) : undefined}
            role={onItemClick ? "button" : undefined}
            tabIndex={onItemClick ? 0 : undefined}
            onKeyDown={
              onItemClick
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onItemClick(segment);
                    }
                  }
                : undefined
            }
            sx={{
              cursor: onItemClick ? "pointer" : "default",
              borderRadius: 1.5,
              px: 0.75,
              py: 0.5,
              transition: "background-color 0.15s ease",
              "&:hover": onItemClick
                ? {
                    backgroundColor: isLight
                      ? "rgba(37,99,235,0.06)"
                      : "rgba(148,163,184,0.08)",
                  }
                : undefined,
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
              {segment.Icon ? (
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    bgcolor: `rgba(${hexToRgb(segment.color)}, 0.18)`,
                    color: segment.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <segment.Icon sx={{ fontSize: 13 }} />
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: segment.color,
                    flexShrink: 0,
                  }}
                />
              )}
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {segment.label}
              </Typography>
            </Stack>
            <Chip
              size="small"
              label={`${segment.value}${
                total ? ` (${Math.round((segment.value / total) * 100)}%)` : ""
              }`}
              sx={{
                fontWeight: 700,
                bgcolor: `rgba(${hexToRgb(segment.color)}, 0.16)`,
                color: segment.color,
              }}
            />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

export function HorizontalBars({ items, onItemClick }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <Stack spacing={1.5}>
      {items.map((item) => (
        <Box
          key={item.label}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          role={onItemClick ? "button" : undefined}
          tabIndex={onItemClick ? 0 : undefined}
          onKeyDown={
            onItemClick
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onItemClick(item);
                  }
                }
              : undefined
          }
          sx={{
            cursor: onItemClick ? "pointer" : "default",
            borderRadius: 1.5,
            px: 0.75,
            py: 0.5,
            transition: "background-color 0.15s ease",
            "&:hover": onItemClick
              ? {
                  backgroundColor: isLight
                    ? "rgba(37,99,235,0.06)"
                    : "rgba(148,163,184,0.08)",
                }
              : undefined,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 0.75 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {item.icon ? (
                <Box sx={{ color: item.color, display: "flex", alignItems: "center" }}>
                  {item.icon}
                </Box>
              ) : null}
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {item.label}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {item.value}
            </Typography>
          </Stack>
          <Box
            sx={{
              width: "100%",
              height: 10,
              borderRadius: 999,
              backgroundColor: isLight ? "rgba(148,163,184,0.20)" : "rgba(148,163,184,0.12)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${(item.value / maxValue) * 100}%`,
                height: "100%",
                borderRadius: 999,
                background: isLight
                  ? `linear-gradient(90deg, ${item.color}, rgba(255,255,255,0.72))`
                  : `linear-gradient(90deg, ${item.color}, rgba(255,255,255,0.95))`,
                transition: "width 700ms ease",
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
