import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";
import { area as d3Area, curveMonotoneX, extent, line as d3Line, scaleLinear, timeFormat } from "d3";

const CHART_MARGIN = { top: 18, right: 18, bottom: 32, left: 62 };

function formatBaseValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatTooltipTime(timestampMs) {
  return timeFormat("%Y-%m-%d %H:%M:%S")(new Date(timestampMs));
}

function formatTickTime(timestampMs, rangeMs) {
  if (rangeMs >= 6 * 24 * 60 * 60 * 1000) {
    return timeFormat("%b %d")(new Date(timestampMs));
  }

  if (rangeMs >= 24 * 60 * 60 * 1000) {
    return timeFormat("%d %b")(new Date(timestampMs));
  }

  return timeFormat("%H:%M")(new Date(timestampMs));
}

function formatSizeUnit(value, unit) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";

  if (unit === "bytes") {
    const abs = Math.abs(value);
    if (abs >= 1024 ** 4) {
      return `${(value / (1024 ** 4)).toLocaleString(undefined, { maximumFractionDigits: 2 })} TB`;
    }
    if (abs >= 1024 ** 3) {
      return `${(value / (1024 ** 3)).toLocaleString(undefined, { maximumFractionDigits: 2 })} GB`;
    }
    if (abs >= 1024 ** 2) {
      return `${(value / (1024 ** 2)).toLocaleString(undefined, { maximumFractionDigits: 2 })} MB`;
    }
    if (abs >= 1024) {
      return `${(value / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 })} KB`;
    }
    return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} B`;
  }

  if (unit === "MB") {
    if (Math.abs(value) >= 1024 * 1024) {
      return `${(value / (1024 * 1024)).toLocaleString(undefined, { maximumFractionDigits: 2 })} TB`;
    }
    if (Math.abs(value) >= 1024) {
      return `${(value / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 })} GB`;
    }
    return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} MB`;
  }

  if (unit === "GB") {
    if (Math.abs(value) >= 1024) {
      return `${(value / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 })} TB`;
    }
    return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} GB`;
  }

  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
}

function formatMetricValue(value, unit) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  if (!unit) return formatBaseValue(value);

  if (unit === "%") {
    return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
  }

  if (unit === "bytes" || unit === "MB" || unit === "GB") {
    return formatSizeUnit(value, unit);
  }

  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
}

function normalizePoints(points) {
  return (points || [])
    .filter(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        point[0] !== null &&
        point[1] !== null &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1]))
    )
    .map(([timestampMs, value]) => ({
      timestampMs: Number(timestampMs),
      value: Number(value),
    }))
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

function MetricsLineChart({
  title,
  subtitle,
  points,
  color = "#FF6B35",
  unit,
  height = 260,
  width = 720,
  headerRight,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const chartSlug = String(title || "metric").replace(/\s+/g, "-").toLowerCase();
  const gradientId = `chart-fill-${chartSlug}`;
  const glowId = `chart-glow-${chartSlug}`;

  const chart = useMemo(() => {
    const data = normalizePoints(points);
    if (!data.length) return null;

    const [minX, maxX] = extent(data, (item) => item.timestampMs);
    const [rawMinY, rawMaxY] = extent(data, (item) => item.value);
    const minY = rawMinY ?? 0;
    const maxY = rawMaxY ?? 0;
    const rangeMs = Math.max((maxX ?? 0) - (minX ?? 0), 0);
    const yPad = (maxY - minY || Math.abs(maxY) || 1) * 0.08;
    const xScale = scaleLinear().domain([minX ?? 0, maxX ?? 0]).range([CHART_MARGIN.left, width - CHART_MARGIN.right]);
    const yScale = scaleLinear()
      .domain([minY - yPad, maxY + yPad])
      .nice(4)
      .range([height - CHART_MARGIN.bottom, CHART_MARGIN.top]);

    const linePath = d3Line()
      .curve(curveMonotoneX)
      .x((item) => xScale(item.timestampMs))
      .y((item) => yScale(item.value))(data);

    const areaPath = d3Area()
      .curve(curveMonotoneX)
      .x((item) => xScale(item.timestampMs))
      .y0(height - CHART_MARGIN.bottom)
      .y1((item) => yScale(item.value))(data);

    const baseTickCount =
      rangeMs >= 6 * 24 * 60 * 60 * 1000 ? 8 : rangeMs >= 24 * 60 * 60 * 1000 ? 7 : 6;
    const widthDrivenTickCount =
      width >= 1100 ? Math.floor(width / 110) : Math.floor(width / 150);
    const tickCount = Math.min(
      Math.max(baseTickCount, widthDrivenTickCount),
      Math.max(4, data.length)
    );

    const xTicks = xScale.ticks(tickCount).map((value) => ({
      value,
      label: formatTickTime(value, rangeMs),
      x: xScale(value),
    }));

    const yTickCount = height >= 340 ? 6 : 4;
    const yTicks = yScale.ticks(yTickCount).map((value) => ({
      value,
      label: formatMetricValue(value, unit),
      y: yScale(value),
    }));

    return {
      data,
      linePath,
      areaPath,
      xTicks,
      yTicks,
      xScale,
      yScale,
      lastValue: data[data.length - 1]?.value,
    };
  }, [height, points, unit, width]);

  const hoveredPoint =
    chart && hoveredIndex !== null && chart.data[hoveredIndex] ? chart.data[hoveredIndex] : null;

  const hoveredCoords = hoveredPoint
    ? {
        x: chart.xScale(hoveredPoint.timestampMs),
        y: chart.yScale(hoveredPoint.value),
      }
    : null;

  const tooltipPosition = hoveredCoords
    ? {
        left: `${(hoveredCoords.x / width) * 100}%`,
        top: `${(hoveredCoords.y / height) * 100}%`,
        transform: [
          hoveredCoords.x > width * 0.72 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
          hoveredCoords.y < height * 0.28 ? "translateY(12px)" : "translateY(calc(-100% - 12px))",
        ].join(" "),
      }
    : null;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 1.25 }}>
        <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: color,
                boxShadow: `0 0 6px ${color}`,
                flexShrink: 0,
              }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "white" }}>
              {title}
            </Typography>
          </Box>
          {subtitle ? (
            <Typography variant="caption" sx={{ color: "#94A3B8", pl: "15px" }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1 }}>
          {chart && chart.lastValue !== undefined ? (
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color, lineHeight: 1 }}>
              {formatMetricValue(chart.lastValue, unit)}
            </Typography>
          ) : null}
          {headerRight}
        </Box>
      </Box>

      {!chart ? (
        <Box
          sx={{
            height,
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "divider",
            display: "grid",
            placeItems: "center",
            color: "text.secondary",
            bgcolor: "rgba(255,255,255,0.02)",
          }}
        >
          <Typography variant="body2">No chart data available</Typography>
        </Box>
      ) : (
        <Box
          sx={{
            position: "relative",
            height,
            borderRadius: 2,
            border: "1px solid rgba(148,163,184,0.18)",
            background: "linear-gradient(180deg, #0B1524 0%, #060B14 100%)",
            overflow: "hidden",
          }}
        >
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                <stop offset="55%" stopColor={color} stopOpacity="0.12" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
              <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={color} floodOpacity="0.55" />
              </filter>
            </defs>

            {chart.yTicks.map((tick) => (
              <g key={`y-${tick.value}`}>
                <line
                  x1={CHART_MARGIN.left}
                  y1={tick.y}
                  x2={width - CHART_MARGIN.right}
                  y2={tick.y}
                  stroke="#1E293B"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                <text x={CHART_MARGIN.left - 10} y={tick.y + 4} textAnchor="end" fill="#94A3B8" fontSize="11">
                  {tick.label}
                </text>
              </g>
            ))}

            <line
              x1={CHART_MARGIN.left}
              y1={height - CHART_MARGIN.bottom}
              x2={width - CHART_MARGIN.right}
              y2={height - CHART_MARGIN.bottom}
              stroke="#1E293B"
              strokeWidth="1"
            />

            {chart.xTicks.map((tick) => (
              <text
                key={`x-${tick.value}`}
                x={tick.x}
                y={height - CHART_MARGIN.bottom + 18}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="11"
              >
                {tick.label}
              </text>
            ))}

            <path d={chart.areaPath || ""} fill={`url(#${gradientId})`} />
            <path
              d={chart.linePath || ""}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowId})`}
            />

            {hoveredCoords ? (
              <g>
                <line
                  x1={hoveredCoords.x}
                  y1={CHART_MARGIN.top}
                  x2={hoveredCoords.x}
                  y2={height - CHART_MARGIN.bottom}
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <circle cx={hoveredCoords.x} cy={hoveredCoords.y} r="9" fill={color} fillOpacity="0.18" />
                <circle cx={hoveredCoords.x} cy={hoveredCoords.y} r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
              </g>
            ) : null}

            {chart.data.map((item, index) => {
              const x = chart.xScale(item.timestampMs);
              const y = chart.yScale(item.value);
              return (
                <circle
                  key={`${item.timestampMs}-${index}`}
                  cx={x}
                  cy={y}
                  r="10"
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseMove={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {hoveredPoint && hoveredCoords ? (
            <Box
              sx={{
                position: "absolute",
                left: tooltipPosition.left,
                top: tooltipPosition.top,
                transform: tooltipPosition.transform,
                pointerEvents: "none",
                minWidth: 170,
                maxWidth: 220,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: "rgba(15,23,42,0.92)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(148,163,184,0.24)",
                boxShadow: `0 18px 40px rgba(2,6,23,0.45), 0 0 0 1px ${color}22`,
                zIndex: 3,
              }}
            >
              <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
                {formatTooltipTime(hoveredPoint.timestampMs)}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ color: "white", fontWeight: 700 }}>
                  {formatMetricValue(hoveredPoint.value, unit)}
                </Typography>
              </Box>
            </Box>
          ) : null}
        </Box>
      )}
    </Box>
  );
}

MetricsLineChart.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  points: PropTypes.arrayOf(PropTypes.array).isRequired,
  color: PropTypes.string,
  unit: PropTypes.string,
  height: PropTypes.number,
  width: PropTypes.number,
  headerRight: PropTypes.node,
};

MetricsLineChart.defaultProps = {
  subtitle: "",
  color: "#FF6B35",
  unit: undefined,
  height: 260,
  width: 720,
  headerRight: null,
};

export default MetricsLineChart;
