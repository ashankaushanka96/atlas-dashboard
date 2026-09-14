import PropTypes from "prop-types";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { keyframes } from "@mui/system";
import RefreshIcon from "@mui/icons-material/Refresh";

export default function HomeWidgetShell({
  title,
  subtitle,
  icon,
  loading,
  loadingContent,
  error,
  onRefresh,
  children,
  footer,
}) {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";

  const shimmer = keyframes`
    0% { background-position: 200% 0; opacity: .72; }
    50% { opacity: 1; }
    100% { background-position: -200% 0; opacity: .72; }
  `;

  const skeletonPulse = keyframes`
    0% { opacity: .45; transform: scale(.985); }
    50% { opacity: .9; transform: scale(1); }
    100% { opacity: .45; transform: scale(.985); }
  `;

  const shellBackground = isLight
    ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)"
    : "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(17,24,39,0.92) 100%)";

  const shellBorder = isLight
    ? "rgba(37,99,235,0.12)"
    : "rgba(96,165,250,0.12)";

  const iconBadgeBackground = isLight
    ? "rgba(37,99,235,0.10)"
    : "rgba(59,130,246,0.12)";

  const skeletonRingBackground = isLight
    ? "linear-gradient(135deg, rgba(37,99,235,.10), rgba(148,163,184,.10))"
    : "linear-gradient(135deg, rgba(96,165,250,.18), rgba(148,163,184,.08))";

  const skeletonRingBorder = isLight
    ? "1px solid rgba(148,163,184,0.20)"
    : "1px solid rgba(148,163,184,0.18)";

  const skeletonInnerBackground = isLight
    ? "rgba(255,255,255,0.96)"
    : "rgba(15,23,42,0.96)";

  const skeletonInnerBorder = isLight
    ? "1px solid rgba(148,163,184,0.18)"
    : "1px solid rgba(148,163,184,0.14)";

  const skeletonBarBackground = isLight
    ? "linear-gradient(90deg, rgba(37,99,235,.10), rgba(148,163,184,.26), rgba(37,99,235,.10))"
    : "linear-gradient(90deg, rgba(96,165,250,.18), rgba(148,163,184,.38), rgba(96,165,250,.18))";

  return (
    <Paper
      sx={{
        p: 2.5,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        background: shellBackground,
        border: `1px solid ${shellBorder}`,
        color: "text.primary",
        boxShadow: isLight
          ? "0 10px 30px rgba(15,23,42,0.08)"
          : "0 14px 36px rgba(0,0,0,0.26)",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={2}
      >
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                background: iconBadgeBackground,
                color: "primary.main",
              }}
            >
              {icon}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Stack>

        <Tooltip title="Refresh widget">
          <span>
            <IconButton onClick={() => onRefresh?.(true)} disabled={loading} size="small">
              {loading ? (
                <CircularProgress size={18} />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Box sx={{ flexGrow: 1, minHeight: 220 }}>
        {loading ? (
          loadingContent || (
            <Box sx={{ height: "100%", display: "flex", alignItems: "center" }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={3}
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width: 178,
                    height: 178,
                    flexShrink: 0,
                    borderRadius: "50%",
                    background: skeletonRingBackground,
                    border: skeletonRingBorder,
                    animation: `${skeletonPulse} 1.5s ease-in-out infinite`,
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 32,
                      borderRadius: "50%",
                      background: skeletonInnerBackground,
                      border: skeletonInnerBorder,
                    }}
                  />
                </Box>

                <Stack spacing={1.25} sx={{ width: "100%" }}>
                  {[72, 88, 60, 76].map((width, index) => (
                    <Stack
                      key={index}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={2}
                      sx={{ px: 0.75, py: 0.5 }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: skeletonBarBackground,
                            backgroundSize: "200% 100%",
                            animation: `${shimmer} 1.4s linear infinite`,
                            flexShrink: 0,
                          }}
                        />
                        <Box
                          sx={{
                            height: 12,
                            width: `${width}%`,
                            borderRadius: 999,
                            background: skeletonBarBackground,
                            backgroundSize: "200% 100%",
                            animation: `${shimmer} 1.4s linear infinite`,
                          }}
                        />
                      </Stack>
                      <Box
                        sx={{
                          height: 24,
                          width: 72,
                          borderRadius: 999,
                          background: skeletonBarBackground,
                          backgroundSize: "200% 100%",
                          animation: `${shimmer} 1.4s linear infinite`,
                          flexShrink: 0,
                        }}
                      />
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Box>
          )
        ) : error ? (
          <Stack justifyContent="center" sx={{ height: "100%", gap: 1.5 }}>
            <Alert severity="error">{error}</Alert>
            <Box>
              <Button variant="outlined" size="small" onClick={() => onRefresh?.(true)}>
                Retry
              </Button>
            </Box>
          </Stack>
        ) : (
          children
        )}
      </Box>

      {footer ? <Box>{footer}</Box> : null}
    </Paper>
  );
}

HomeWidgetShell.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.node,
  loading: PropTypes.bool,
  loadingContent: PropTypes.node,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onRefresh: PropTypes.func,
  children: PropTypes.node,
  footer: PropTypes.node,
};

HomeWidgetShell.defaultProps = {
  subtitle: "",
  icon: null,
  loading: false,
  loadingContent: null,
  error: null,
  onRefresh: undefined,
  children: null,
  footer: null,
};
