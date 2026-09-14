import PropTypes from "prop-types";
import {
  Alert,
  Box,
  IconButton,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { keyframes } from "@mui/system";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import WidgetsIcon from "@mui/icons-material/Widgets";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import StatusChip from "../HostDetails/StatusChip";
import { getPlatformConfig } from "../ComponentDB/componentStatusConfig";
import hexToRgb from "../shared/hexToRgb";
import {
  formatRepoTitle,
  getLatestVersion,
  getVersionStatusColor,
  isLatestComponentVersion,
} from "./pipelinesUtils";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
});

function PipelinesTable({
  error,
  groupedPipelines,
  hasActiveFilters,
  loading,
  onCopyToClipboard,
  onOpenComponentDb,
}) {
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

  if (loading) {
    return (
      <Stack spacing={2} sx={{ minHeight: "100%", height: "100%" }}>
        {[0, 1, 2].map((groupIndex) => (
          <Paper
            key={`pipeline-skeleton-${groupIndex}`}
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              sx={{ mb: 2 }}
            >
              <Box sx={{ minWidth: 0, width: "100%" }}>
                <Box sx={{ ...shimmerBlockSx, height: 18, width: "28%", mb: 1.25 }} />
                <Box sx={{ ...shimmerBlockSx, height: 14, width: "42%" }} />
              </Box>
              <Box sx={{ ...shimmerBlockSx, height: 24, width: 110, flexShrink: 0 }} />
            </Stack>

            <TableContainer sx={{ flex: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {Array.from({ length: 8 }, (_, index) => (
                      <TableCell key={`pipeline-skeleton-head-${index}`} align="center">
                        <Box
                          sx={{
                            ...shimmerBlockSx,
                            height: 12,
                            width: `${index === 6 ? 70 : 52}%`,
                            mx: "auto",
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from({ length: 3 }, (_, rowIndex) => (
                    <TableRow key={`pipeline-skeleton-row-${groupIndex}-${rowIndex}`}>
                      <TableCell align="center">
                        <Box sx={{ ...shimmerBlockSx, height: 12, width: "68%", mx: "auto" }} />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ ...shimmerBlockSx, height: 12, width: "52%", mx: "auto" }} />
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          <Box sx={{ ...shimmerBlockSx, height: 12, width: 96 }} />
                          <Box
                            sx={{ ...shimmerBlockSx, width: 24, height: 24, borderRadius: "50%" }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ ...shimmerBlockSx, height: 24, width: 52, mx: "auto" }} />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ ...shimmerBlockSx, height: 12, width: "58%", mx: "auto" }} />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ ...shimmerBlockSx, height: 12, width: "62%", mx: "auto" }} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ ...shimmerBlockSx, height: 12, width: "86%" }} />
                          <Box
                            sx={{ ...shimmerBlockSx, width: 24, height: 24, borderRadius: "50%" }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            ...shimmerBlockSx,
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            mx: "auto",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      {groupedPipelines.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {hasActiveFilters
              ? "No pipeline-configured components matched your filters."
              : "No pipeline-configured components with code repository groupings were found."}
          </Typography>
        </Paper>
      ) : null}

      {groupedPipelines.map((group) => {
        const latestVersion = getLatestVersion(group.components);

        return (
        <Paper
          key={group.key}
          sx={{
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            sx={{ mb: 2 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {formatRepoTitle(group.codeRepoUrl)}
              </Typography>
              {group.codeRepoUrl ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Link
                    href={group.codeRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{ wordBreak: "break-all" }}
                  >
                    {group.codeRepoUrl}
                  </Link>
                  <Tooltip title="Copy repository URL">
                    <IconButton
                      size="small"
                      onClick={() => onCopyToClipboard(group.codeRepoUrl)}
                      sx={tintedIconButtonSx("#94A3B8")}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Components without a code repository URL
                </Typography>
              )}
            </Box>

            <StatusChip
              label={`${group.components.length} components`}
              color="#60A5FA"
              Icon={WidgetsIcon}
            />
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center">Component Name</TableCell>
                  <TableCell align="center">Region</TableCell>
                  <TableCell align="center">IP</TableCell>
                  <TableCell align="center">Platform</TableCell>
                  <TableCell align="center">Current Version</TableCell>
                  <TableCell align="center">Release Date</TableCell>
                  <TableCell align="center">Component Path</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {group.components.map((component, index) => (
                  <TableRow
                    key={`${group.key}-${component.ip}-${component.component_name}-${index}`}
                    hover
                  >
                    <TableCell align="center">
                      <Typography variant="body2">
                        {component.component_name
                          ? String(component.component_name).toLowerCase()
                          : "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{component.region || "N/A"}</TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                        }}
                      >
                        <Typography variant="body2" fontFamily="monospace">
                          {component.ip || "N/A"}
                        </Typography>
                        {component.ip ? (
                          <Tooltip title="Copy IP">
                            <IconButton
                              size="small"
                              onClick={() => onCopyToClipboard(component.ip)}
                              sx={tintedIconButtonSx("#94A3B8")}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <StatusChip
                        label={component.platform || "N/A"}
                        color={getPlatformConfig(component.platform).color}
                        Icon={getPlatformConfig(component.platform).Icon}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {(() => {
                        const isLatest = isLatestComponentVersion(component, latestVersion);
                        return (
                          <StatusChip
                            label={component.comp_version || "N/A"}
                            color={getVersionStatusColor(isLatest)}
                            Icon={isLatest ? CheckCircleIcon : ErrorOutlineIcon}
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {component.release_date
                          ? new Date(component.release_date).toLocaleDateString()
                          : "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                          variant="body2"
                          fontFamily="monospace"
                          sx={{ flex: 1, wordBreak: "break-word" }}
                        >
                          {component.comp_path || "N/A"}
                        </Typography>
                        {component.comp_path ? (
                          <Tooltip title="Copy path">
                            <IconButton
                              size="small"
                              onClick={() => onCopyToClipboard(component.comp_path)}
                              sx={tintedIconButtonSx("#94A3B8")}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Open in Component DB">
                        <IconButton
                          size="small"
                          onClick={() => onOpenComponentDb(component)}
                          sx={tintedIconButtonSx("#60A5FA")}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        );
      })}
    </Stack>
  );
}

PipelinesTable.propTypes = {
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  groupedPipelines: PropTypes.arrayOf(PropTypes.object).isRequired,
  hasActiveFilters: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  onCopyToClipboard: PropTypes.func.isRequired,
  onOpenComponentDb: PropTypes.func.isRequired,
};

PipelinesTable.defaultProps = {
  error: null,
};

export default PipelinesTable;
