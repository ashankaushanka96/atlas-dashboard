// Route53.jsx
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  FormControl,
  Select,
  MenuItem,
  Box,
  Typography,
  useTheme,
  Tooltip,
  IconButton,
  Stack,
} from "@mui/material";
import { keyframes } from "@mui/system";
import RefreshIcon from "@mui/icons-material/Refresh";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import { API } from "../../services/auth";
import ZoneCard from "./ZoneCard";
import ErrorModal from "../../modals/ErrorModal";
import StatusChip from "../HostDetails/StatusChip";
import hexToRgb from "../shared/hexToRgb";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const HEADER_ACCENT = "#FF6B35";
const ZONE_SELECT_ACCENT = "#60A5FA";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
  "&.Mui-disabled": { color: "text.disabled", bgcolor: "transparent" },
});

function Route53() {
  const wrapperRef = useRef(null);
  const zonesRef = useRef([]);
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";

  const [zones, setZones] = useState([]);
  const [hostedZoneOptions, setHostedZoneOptions] = useState([
    { label: "All Zones", value: "all" },
  ]);
  const [error, setError] = useState(null);
  const [selectedZone, setSelectedZone] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openErrorModal, setOpenErrorModal] = useState(false);

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
  const skeletonCardBackground = isLight
    ? "radial-gradient(circle at top center, rgba(37,99,235,0.08), transparent 30%), rgba(255,255,255,0.95)"
    : "radial-gradient(circle at top center, rgba(96,165,250,0.12), transparent 30%), rgba(15,23,42,0.88)";
  const skeletonCardBorder = isLight
    ? "rgba(37,99,235,0.16)"
    : "rgba(96,165,250,0.18)";

  const shimmerBlockSx = {
    borderRadius: 999,
    background: skeletonBarBackground,
    backgroundSize: "200% 100%",
    animation: `${shimmer} 1.4s linear infinite`,
  };

  const [searchParams, setSearchParams] = useSearchParams();

  const normalizeZone = useCallback(
    (zone, overrides = {}) => ({
      ...zone,
      status_loading: false,
      ...overrides,
    }),
    []
  );

  const showErrorModal = (message) => {
    setError(message);
    setOpenErrorModal(true);
  };

  const zoneFromUrl = useMemo(
    () => searchParams.get("zone") || "all",
    [searchParams]
  );

  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  const fetchZoneOptions = useCallback(async () => {
    try {
      const response = await API.get(`/route53/fetch-zone-names`);
      const options = [
        { label: "All Zones", value: "all" },
        ...response.data.map((name) => ({ label: name, value: name })),
      ];

      if (
        zoneFromUrl !== "all" &&
        !options.some((option) => option.value === zoneFromUrl)
      ) {
        options.push({ label: zoneFromUrl, value: zoneFromUrl });
      }

      setHostedZoneOptions(options);
    } catch (err) {
      showErrorModal(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
      setHostedZoneOptions([{ label: "All Zones", value: "all" }]);
    }
  }, [zoneFromUrl]);

  useEffect(() => {
    if (!searchParams.get("zone")) {
      const next = new URLSearchParams(searchParams);
      next.set("zone", "all");
      setSearchParams(next, { replace: true });
    }

    fetchZoneOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSelectedZone(zoneFromUrl);
  }, [zoneFromUrl]);

  const fetchZoneData = useCallback(
    async (zone, fresh = false) => {
      if (fresh) {
        setRefreshing(true);
        setZones((currentZones) =>
          currentZones.map((currentZone) =>
            normalizeZone(currentZone, { status_loading: true })
          )
        );
      } else if (zonesRef.current.length === 0) {
        setLoading(true);
      }

      const url =
        zone === "all"
          ? `/route53/fetch-zones`
          : `/route53/fetch-zone-detail?zone_name=${encodeURIComponent(zone)}`;

      try {
        const response = await API.get(url, {
          params: { fresh: fresh ? "true" : "false" },
        });

        setZones(
          zone === "all"
            ? response.data.route53_details.map((item) => normalizeZone(item))
            : [normalizeZone(response.data.zone_detail)]
        );
      } catch (err) {
        showErrorModal(
          err.response?.data?.error_message || "An unexpected error occurred"
        );

        if (fresh) {
          setZones((currentZones) =>
            currentZones.map((currentZone) =>
              normalizeZone(currentZone, { status_loading: false })
            )
          );
        } else {
          setZones([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [normalizeZone]
  );

  useEffect(() => {
    const loadZoneData = async () => {
      await fetchZoneData(selectedZone, false);
      await fetchZoneData(selectedZone, true);
    };

    loadZoneData();
  }, [selectedZone, fetchZoneData]);

  const handleSelectChange = (zone) => {
    setSelectedZone(zone);
    const next = new URLSearchParams(searchParams);

    if (zone && zone !== "all") {
      next.set("zone", zone);
    } else {
      next.set("zone", "all");
    }

    setSearchParams(next, { replace: true });
  };

  const handleRefresh = () => {
    fetchZoneData(selectedZone, true);
  };

  return (
    <Box
      ref={wrapperRef}
      sx={{
        position: "relative",
        p: 2,
        height: "100%",
        overflowY: "auto",
      }}
    >
      {openErrorModal && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(4px)",
            zIndex: 1200,
          }}
        />
      )}

      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DnsRoundedIcon sx={{ color: HEADER_ACCENT }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Route 53
          </Typography>
        </Box>

        <StatusChip label={`${zones.length} zones`} color={ZONE_SELECT_ACCENT} Icon={PublicRoundedIcon} />
      </Box>

      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 3, flexWrap: "wrap" }}>
        <FormControl
          variant="outlined"
          size="small"
          sx={{
            minWidth: 300,
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingTop: "7px",
              paddingBottom: "7px",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderRadius: 999,
              borderColor:
                selectedZone !== "all"
                  ? `rgba(${hexToRgb(ZONE_SELECT_ACCENT)}, 0.5)`
                  : "rgba(148, 163, 184, 0.32)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: `rgba(${hexToRgb(ZONE_SELECT_ACCENT)}, 0.7)`,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: ZONE_SELECT_ACCENT,
            },
          }}
        >
          <Select
            value={selectedZone}
            onChange={(e) => handleSelectChange(e.target.value)}
            displayEmpty
            inputProps={{ "aria-label": "Hosted Zone" }}
            MenuProps={{
              PaperProps: {
                sx: {
                  mt: 1,
                  borderRadius: "12px",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                  "& .MuiMenuItem-root": {
                    borderRadius: "8px",
                    mx: 0.75,
                    my: 0.15,
                    minHeight: 32,
                    py: 0.25,
                    fontSize: 13,
                  },
                  "& .MuiMenuItem-root:hover": {
                    bgcolor: `rgba(${hexToRgb(ZONE_SELECT_ACCENT)}, 0.12)`,
                  },
                  "& .MuiMenuItem-root.Mui-selected": {
                    bgcolor: `rgba(${hexToRgb(ZONE_SELECT_ACCENT)}, 0.16)`,
                    color: ZONE_SELECT_ACCENT,
                    fontWeight: 600,
                  },
                },
              },
            }}
            renderValue={(selected) => {
              const optionLabel =
                hostedZoneOptions.find((option) => option.value === selected)?.label || selected;
              return (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <DnsRoundedIcon sx={{ fontSize: 16, color: ZONE_SELECT_ACCENT }} />
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ fontWeight: selectedZone !== "all" ? 600 : 400 }}
                  >
                    {optionLabel}
                  </Typography>
                </Stack>
              );
            }}
          >
            {hostedZoneOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Tooltip title={refreshing ? "Refreshing..." : "Refresh current data"}>
          <span>
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh data"
              sx={tintedIconButtonSx(ZONE_SELECT_ACCENT)}
            >
              <Box
                component={motion.span}
                animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={{
                  repeat: refreshing ? Infinity : 0,
                  duration: 0.8,
                  ease: "linear",
                }}
                sx={{ display: "inline-flex" }}
              >
                <RefreshIcon fontSize="small" />
              </Box>
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {loading && zones.length === 0 ? (
        <Box sx={{ mt: 2 }}>
          {[0, 1].map((item) => (
            <Box
              key={item}
              sx={{
                mb: 3,
                overflow: "hidden",
                borderRadius: 2.25,
                border: "1px solid",
                borderColor: skeletonCardBorder,
                background: skeletonCardBackground,
                boxShadow: isLight
                  ? "0 22px 54px rgba(15,23,42,0.08)"
                  : "0 22px 54px rgba(0,0,0,0.26)",
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 2.1,
                  borderBottom: "1px solid",
                  borderColor: skeletonCardBorder,
                  background: isLight
                    ? "linear-gradient(180deg, rgba(37,99,235,0.08), transparent)"
                    : "linear-gradient(180deg, rgba(96,165,250,0.12), transparent)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ minWidth: 240, flex: 1 }}>
                    <Box sx={{ ...shimmerBlockSx, height: 19, width: "42%", mb: 1 }} />
                    <Box sx={{ ...shimmerBlockSx, height: 11, width: "58%" }} />
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Box sx={{ ...shimmerBlockSx, height: 32, width: 138 }} />
                    <Box sx={{ ...shimmerBlockSx, height: 32, width: 112 }} />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ p: 2.5 }}>
                <Box sx={{ ...shimmerBlockSx, height: 10, width: 116, mb: 2 }} />

                <Box sx={{ maxWidth: 1120, mx: "auto", position: "relative" }}>
                  <Box
                    sx={{
                      maxWidth: 460,
                      mx: "auto",
                      mb: 9,
                      px: 2.5,
                      py: 2,
                      borderRadius: 2,
                      border: skeletonRingBorder,
                      background: skeletonRingBackground,
                      animation: `${skeletonPulse} 1.5s ease-in-out infinite`,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                      <Box
                        sx={{
                          position: "relative",
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          background: skeletonRingBackground,
                          border: skeletonRingBorder,
                        }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            inset: 5,
                            borderRadius: 0.75,
                            background: skeletonInnerBackground,
                            border: skeletonInnerBorder,
                          }}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ ...shimmerBlockSx, height: 10, width: "22%", mx: "auto", mb: 1 }} />
                    <Box sx={{ ...shimmerBlockSx, height: 18, width: "54%", mx: "auto" }} />
                  </Box>

                  <Box
                    sx={{
                      position: "absolute",
                      top: 84,
                      left: "50%",
                      width: 2,
                      height: 60,
                      transform: "translateX(-50%)",
                      ...shimmerBlockSx,
                      borderRadius: 999,
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      top: 142,
                      left: { xs: "20%", lg: "25%" },
                      right: { xs: "20%", lg: "25%" },
                      height: 2,
                      ...shimmerBlockSx,
                      borderRadius: 999,
                    }}
                  />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                      gap: 2,
                      mt: 3,
                    }}
                  >
                    {[0, 1].map((branch) => (
                      <Box
                        key={branch}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          background: isLight
                            ? "linear-gradient(180deg, rgba(255,255,255,0.86), rgba(248,250,252,0.92))"
                            : "linear-gradient(180deg, rgba(15,23,42,0.78), rgba(17,24,39,0.9))",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 1.5,
                            mb: 1.35,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: skeletonBarBackground,
                                backgroundSize: "200% 100%",
                                animation: `${shimmer} 1.4s linear infinite`,
                              }}
                            />
                            <Box sx={{ ...shimmerBlockSx, height: 14, width: 74 }} />
                          </Box>
                          <Box sx={{ ...shimmerBlockSx, height: 28, width: 116 }} />
                        </Box>

                        <Box sx={{ display: "grid", gap: 1 }}>
                          <Box sx={{ ...shimmerBlockSx, height: 11, width: "72%" }} />
                          <Box sx={{ ...shimmerBlockSx, height: 11, width: "48%" }} />
                          <Box sx={{ ...shimmerBlockSx, height: 11, width: "64%" }} />
                        </Box>

                        <Box
                          sx={{
                            mt: 2,
                            p: 1.25,
                            borderRadius: 1.5,
                            border: "1px solid",
                            borderColor: "divider",
                            background: isLight
                              ? "rgba(255,255,255,0.88)"
                              : "rgba(15,23,42,0.66)",
                          }}
                        >
                          <Box sx={{ ...shimmerBlockSx, height: 10, width: "36%", mb: 1 }} />
                          <Box sx={{ ...shimmerBlockSx, height: 10, width: "68%", mb: 0.9 }} />
                          <Box sx={{ ...shimmerBlockSx, height: 10, width: "54%" }} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      ) : zones.length === 0 ? (
        <Typography
          variant="h6"
          color="error"
          sx={{ textAlign: "center", mt: 4 }}
        >
          No zones found
        </Typography>
      ) : (
        <AnimatePresence>
          {zones.map((zone, idx) => (
            <motion.div
              key={zone.hosted_zone || idx}
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{
                type: "tween",
                duration: 0.45,
                ease: "easeOut",
                delay: idx * 0.08,
              }}
            >
            <ZoneCard zone={zone} />
          </motion.div>
        ))}
        </AnimatePresence>
      )}

      <ErrorModal
        wrapperRef={wrapperRef}
        open={openErrorModal}
        error={error}
        onClose={() => setOpenErrorModal(false)}
      />
    </Box>
  );
}

export default Route53;
