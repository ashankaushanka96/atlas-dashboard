// ServerHandler.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Grid, Box, Typography, useTheme } from "@mui/material";
import { keyframes } from "@mui/system";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import { motion, AnimatePresence } from "framer-motion";
import ServerCard from "./ServerCard";
import authService, { API } from "../../services/auth";
import ErrorModal from "../../modals/ErrorModal";
import StatusChip from "../HostDetails/StatusChip";

const HEADER_ACCENT = "#FF6B35";

function ServerHandler() {
  const wrapperRef = useRef(null);
  const theme = useTheme();
  const permissions = authService.getPermissions();

  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openErrorModal, setOpenErrorModal] = useState(false);

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

  const normalizeInstance = (instance, overrides = {}) => ({
    ...instance,
    instance_name: instance.instance_name || "N/A",
    private_ip: instance.private_ip || "N/A",
    instance_status: instance.instance_status || "unknown",
    status_loading: false,
    ...overrides,
  });

  const showErrorModal = (message) => {
    setError(message);
    setOpenErrorModal(true);
  };

  const fetchServerDetails = useCallback(async (fresh = false) => {
    const url = `/server-start-stop/fetch-start-stop-instances`;
    if (fresh) {
      setInstances((currentInstances) =>
        currentInstances.length > 0
          ? currentInstances.map((instance) =>
              normalizeInstance(instance, { status_loading: true })
            )
          : currentInstances
      );
    }
    try {
      const response = await API.get(url, {
        params: { fresh: fresh ? "true" : "false" },
      });
      const nextInstances = (response.data.instances || []).map((instance) =>
        normalizeInstance(instance)
      );
      setInstances(nextInstances);
    } catch (err) {
      showErrorModal(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
      if (fresh) {
        setInstances((currentInstances) =>
          currentInstances.map((instance) =>
            normalizeInstance(instance, { status_loading: false })
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadInstances = async () => {
      await fetchServerDetails(false);
      await fetchServerDetails(true);
    };

    loadInstances();
  }, [fetchServerDetails]);

  const serverStartStop = async (
    instance_id,
    region,
    action,
    currentStatus
  ) => {
    const url = `/server-start-stop/start-stop-instance`;
    try {
      await API.post(url, { instance_id, region, action });
      setInstances((prev) => {
        return prev.map((inst) =>
          inst.instance_id === instance_id
            ? normalizeInstance(inst, {
                instance_status: action === "start" ? "running" : "stopped",
                status_loading: false,
              })
            : inst
        );
      });
    } catch (err) {
      showErrorModal(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
      setInstances((prev) => {
        return prev.map((inst) =>
          inst.instance_id === instance_id
            ? normalizeInstance(inst, {
                instance_status: currentStatus,
                status_loading: false,
              })
            : inst
        );
      });
    }
  };

  const handleToggle = async (instanceId, region, currentStatus) => {
    if (currentStatus === "starting" || currentStatus === "stopping") return;
    const action = currentStatus === "running" ? "stop" : "start";
    const pendingStatus = action === "start" ? "starting" : "stopping";

    setInstances((prev) =>
      prev.map((inst) =>
        inst.instance_id === instanceId
          ? normalizeInstance(inst, {
              instance_status: pendingStatus,
              status_loading: false,
            })
          : inst
      )
    );
    await serverStartStop(instanceId, region, action, currentStatus);
  };

  const loadingPlaceholders = [0, 1];

  return (
    <Box
      ref={wrapperRef}
      sx={{
        position: "relative",
        flexGrow: 1,
        p: 2,
      }}
    >
      {/* Section-only backdrop for ErrorModal */}
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

      {/* Header Section with Logo and Title */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TerminalRoundedIcon sx={{ color: HEADER_ACCENT }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Server Handler
          </Typography>
        </Box>

        <StatusChip label={`${instances.length} servers`} color="#60A5FA" Icon={DnsRoundedIcon} />
      </Box>

      {loading && instances.length === 0 ? (
        <Grid container spacing={2}>
          {loadingPlaceholders.map((placeholder) => (
            <Grid item xs={12} md={6} key={placeholder}>
              <Box
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.04))",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      width: 34,
                      height: 34,
                      borderRadius: 1.25,
                      background: skeletonRingBackground,
                      border: skeletonRingBorder,
                      animation: `${skeletonPulse} 1.5s ease-in-out infinite`,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 7,
                        borderRadius: 0.9,
                        background: skeletonInnerBackground,
                        border: skeletonInnerBorder,
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        height: 14,
                        width: "58%",
                        borderRadius: 999,
                        background: skeletonBarBackground,
                        backgroundSize: "200% 100%",
                        animation: `${shimmer} 1.4s linear infinite`,
                        mb: 1,
                      }}
                    />
                    <Box
                      sx={{
                        height: 10,
                        width: "26%",
                        borderRadius: 999,
                        background: skeletonBarBackground,
                        backgroundSize: "200% 100%",
                        animation: `${shimmer} 1.4s linear infinite`,
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      height: 24,
                      width: 88,
                      borderRadius: 999,
                      background: skeletonBarBackground,
                      backgroundSize: "200% 100%",
                      animation: `${shimmer} 1.4s linear infinite`,
                      flexShrink: 0,
                    }}
                  />
                </Box>

                <Box sx={{ px: 2, py: 1.5, display: "grid", gap: 1.2 }}>
                  {[42, 54, 65].map((width) => (
                    <Box
                      key={width}
                      sx={{
                        height: 11,
                        width: `${width}%`,
                        borderRadius: 999,
                        background: skeletonBarBackground,
                        backgroundSize: "200% 100%",
                        animation: `${shimmer} 1.4s linear infinite`,
                      }}
                    />
                  ))}
                </Box>

                <Box
                  sx={{
                    px: 2,
                    py: 1.25,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      height: 10,
                      width: "34%",
                      borderRadius: 999,
                      background: skeletonBarBackground,
                      backgroundSize: "200% 100%",
                      animation: `${shimmer} 1.4s linear infinite`,
                    }}
                  />
                  <Box
                    sx={{
                      height: 36,
                      width: 128,
                      borderRadius: 1.5,
                      background: skeletonBarBackground,
                      backgroundSize: "200% 100%",
                      animation: `${shimmer} 1.4s linear infinite`,
                      flexShrink: 0,
                    }}
                  />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      ) : instances.length > 0 ? (
        <Grid container spacing={2}>
          <AnimatePresence initial={false}>
            {instances.map((inst) => (
              <Grid item xs={12} md={6} key={inst.instance_id}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                >
                  <ServerCard
                    instance={inst}
                    onToggle={handleToggle}
                    canControl={Boolean(permissions.start_stop_servers)}
                  />
                </motion.div>
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      ) : (
        <Typography color="error" sx={{ textAlign: "center", mt: 2 }}>
          No Servers Found
        </Typography>
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

export default ServerHandler;
