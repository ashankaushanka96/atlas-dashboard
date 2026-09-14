import { useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Stack, Typography, useTheme } from "@mui/material";
import { keyframes } from "@mui/system";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { HorizontalBars } from "../HomeCharts";
import HomeWidgetShell from "../HomeWidgetShell";
import { INFRA_RESOURCE_CONFIG } from "../homeConfig.jsx";
import { CHART_COLORS, regionMatches } from "../homeUtils";
import useWidgetData from "../useWidgetData";

export default function InfrastructureFootprintWidget({ selectedRegion = "" }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  const shimmer = keyframes`
    0% { background-position: 200% 0; opacity: .72; }
    50% { opacity: 1; }
    100% { background-position: -200% 0; opacity: .72; }
  `;
  const skeletonBarBackground = isLight
    ? "linear-gradient(90deg, rgba(37,99,235,.10), rgba(148,163,184,.26), rgba(37,99,235,.10))"
    : "linear-gradient(90deg, rgba(96,165,250,.18), rgba(148,163,184,.38), rgba(96,165,250,.18))";
  const shimmerBlockSx = {
    borderRadius: 999,
    background: skeletonBarBackground,
    backgroundSize: "200% 100%",
    animation: `${shimmer} 1.4s linear infinite`,
  };

  const loadInfrastructureFootprint = useCallback(async ({ fresh = false } = {}) => {
    const results = await Promise.allSettled(
      INFRA_RESOURCE_CONFIG.map(async (resource, index) => ({
        key: resource.key,
        label: resource.label,
        icon: resource.icon,
        color: CHART_COLORS[index % CHART_COLORS.length],
        value: (await resource.load({ fresh })).filter((item) =>
          regionMatches(item, selectedRegion)
        ).length,
      }))
    );

    const items = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        items.push(result.value);
      } else {
        failed.push(INFRA_RESOURCE_CONFIG[index].label);
      }
    });

    if (items.length === 0) {
      throw new Error("Failed to load all infrastructure summaries");
    }

    return {
      total: items.reduce((sum, item) => sum + item.value, 0),
      items: items.sort((a, b) => b.value - a.value),
      failed,
    };
  }, [selectedRegion]);

  const { loading, error, data, reload } = useWidgetData(
    loadInfrastructureFootprint
  );

  const handleResourceClick = (item) => {
    const tabMap = {
      EC2: "0",
      "ECS Clusters": "1",
      "ECS Services": "1",
      EKS: "2",
      Lambda: "3",
      Redis: "4",
      MSK: "5",
      "Load Balancers": "6",
    };

    const params = new URLSearchParams();
    params.set("tab", tabMap[item.label] || "0");
    if (selectedRegion) {
      params.set("region", selectedRegion);
    }
    navigate(`/infrastructure-details?${params.toString()}`);
  };

  return (
    <HomeWidgetShell
      title="Infrastructure Footprint"
      subtitle="Resource counts across the infrastructure inventory."
      icon={<DashboardIcon fontSize="small" />}
      loading={loading}
      loadingContent={
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="baseline">
            <Box sx={{ ...shimmerBlockSx, height: 42, width: 78, borderRadius: 2 }} />
            <Box sx={{ ...shimmerBlockSx, height: 14, width: 156 }} />
          </Stack>
          <Stack spacing={1.5}>
            {[
              { label: 34, value: 22, bar: 88 },
              { label: 42, value: 18, bar: 74 },
              { label: 38, value: 16, bar: 61 },
              { label: 30, value: 14, bar: 48 },
              { label: 46, value: 20, bar: 36 },
            ].map((item, index) => (
              <Box key={index} sx={{ px: 0.75, py: 0.5 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 0.75 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: 1,
                        ...shimmerBlockSx,
                      }}
                    />
                    <Box sx={{ ...shimmerBlockSx, height: 12, width: item.label }} />
                  </Box>
                  <Box sx={{ ...shimmerBlockSx, height: 12, width: item.value }} />
                </Stack>
                <Box
                  sx={{
                    width: "100%",
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: isLight
                      ? "rgba(148,163,184,0.20)"
                      : "rgba(148,163,184,0.12)",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      ...shimmerBlockSx,
                      width: `${item.bar}%`,
                      height: "100%",
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </Stack>
      }
      error={error}
      onRefresh={reload}
      footer={
        data?.failed?.length ? (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Partial data loaded. Missing: {data.failed.join(", ")}
          </Alert>
        ) : null
      }
    >
      {data && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="baseline">
            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1 }}>
              {data.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              total tracked resources
            </Typography>
          </Stack>
          <HorizontalBars items={data.items} onItemClick={handleResourceClick} />
        </Stack>
      )}
    </HomeWidgetShell>
  );
}

InfrastructureFootprintWidget.propTypes = {
  selectedRegion: PropTypes.string,
};
