import { useState } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Fade,
  Grow,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { keyframes } from "@mui/system";
import LoginIcon from "@mui/icons-material/Login";
import MicrosoftIcon from "@mui/icons-material/Window";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import CloudQueueRoundedIcon from "@mui/icons-material/CloudQueueRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";

import { entra } from "../../config/config.js";
import authService from "../../services/auth";

const FEATURE_CHIPS = [
  { icon: MonitorHeartRoundedIcon, label: "Live Monitoring" },
  { icon: CloudQueueRoundedIcon, label: "EC2 Scheduling" },
  { icon: DnsRoundedIcon, label: "Route 53" },
  { icon: TimelineRoundedIcon, label: "Pipelines" },
];

const LoadingOverlay = ({ open, text }) => {
  const glow = keyframes`
    0%, 100% { opacity: .55; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.08); }
  `;

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (t) => t.zIndex.modal + 1,
        color: "#fff",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        background: "rgba(6,9,17,0.72)",
      }}
      aria-busy={open}
      aria-live="polite"
    >
      <Fade in={open} timeout={{ enter: 300, exit: 150 }}>
        <Paper
          elevation={10}
          sx={{
            px: 4,
            py: 4.5,
            width: 380,
            maxWidth: "92vw",
            textAlign: "center",
            borderRadius: 4,
            background: "rgba(15,23,42,0.96)",
            border: "1px solid rgba(148,163,184,0.22)",
            boxShadow:
              "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(96,165,250,0.08)",
          }}
        >
          <Box sx={{ position: "relative", width: 68, height: 68, mx: "auto", mb: 3 }}>
            <Box
              sx={{
                position: "absolute",
                inset: -10,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(96,165,250,0.5) 0%, rgba(96,165,250,0) 70%)",
                animation: `${glow} 1.8s ease-in-out infinite`,
              }}
            />
            <Box
              sx={{
                position: "relative",
                width: 68,
                height: 68,
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #60A5FA 0%, #34D399 100%)",
              }}
            >
              <CircularProgress
                thickness={4.5}
                size={34}
                sx={{ color: "#0B1020" }}
              />
            </Box>
          </Box>

          <Typography
            variant="h6"
            sx={{ fontWeight: 800, letterSpacing: 0.2, color: "#fff" }}
          >
            {text}
          </Typography>
          <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5 }}>
            Just a moment...
          </Typography>

          <LinearProgress
            sx={{
              mt: 3,
              borderRadius: 999,
              height: 6,
              backgroundColor: "rgba(148,163,184,0.15)",
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(90deg, #60A5FA, #34D399)",
              },
            }}
          />
        </Paper>
      </Fade>
    </Backdrop>
  );
};

LoadingOverlay.propTypes = {
  open: PropTypes.bool.isRequired,
  text: PropTypes.string.isRequired,
};

const SignInPage = ({ onSignInSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const redirectTo = from
    ? `${from.pathname || ""}${from.search || ""}${from.hash || ""}` || "/"
    : "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const finishLogin = () => {
    if (typeof onSignInSuccess === "function") {
      onSignInSuccess();
    }
    navigate(redirectTo, { replace: true });
  };

  const handleSignIn = async (event) => {
    event?.preventDefault?.();
    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (entra.enabled) {
        await authService.login();
      } else {
        await authService.login({ username, password });
      }
      finishLogin();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Sign-in failed. Check the configuration and try again.",
      );
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event?.preventDefault?.();
    if (loading) {
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await authService.register({ username, password });
      finishLogin();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error_message ||
          err?.message ||
          "Registration failed. Check the configuration and try again.",
      );
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    if (loading) {
      return;
    }
    setError("");
    setConfirmPassword("");
    setIsRegisterMode((prev) => !prev);
  };

  const float = keyframes`
    0% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(3%, -4%) scale(1.06); }
    100% { transform: translate(0, 0) scale(1); }
  `;

  return (
    <Container
      component="main"
      disableGutters
      maxWidth={false}
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 15% 15%, #131B33 0%, #0B1020 45%, #060911 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 40%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 40%, #000 40%, transparent 100%)",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "-15%",
          left: "-10%",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(96,165,250,0.4) 0%, rgba(96,165,250,0) 70%)",
          filter: "blur(10px)",
          animation: `${float} 14s ease-in-out infinite`,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: "-20%",
          right: "-8%",
          width: 620,
          height: 620,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(52,211,153,0.32) 0%, rgba(52,211,153,0) 70%)",
          filter: "blur(10px)",
          animation: `${float} 18s ease-in-out infinite reverse`,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "35%",
          right: "18%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(129,140,248,0.22) 0%, rgba(129,140,248,0) 70%)",
          filter: "blur(10px)",
          animation: `${float} 20s ease-in-out infinite`,
        }}
      />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
          p: { xs: 2, md: 4 },
          width: "100%",
        }}
      >
        <Grow in timeout={500}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                width: 76,
                height: 76,
                mx: "auto",
                mb: 2.5,
                borderRadius: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg, #60A5FA 0%, #34D399 100%)",
                boxShadow:
                  "0 12px 32px rgba(96,165,250,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              <MonitorHeartRoundedIcon sx={{ fontSize: 40, color: "#0B1020" }} />
            </Box>

            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,
                letterSpacing: -0.5,
                fontSize: { xs: "2.4rem", md: "3rem" },
                background: "linear-gradient(135deg, #F8FAFC 20%, #93C5FD 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Atlas Dashboard
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: "#94A3B8", mt: 1, fontWeight: 500, letterSpacing: 0.2 }}
            >
              SRE Operations & Infrastructure Monitoring
            </Typography>

            <Stack
              direction="row"
              spacing={1.2}
              justifyContent="center"
              flexWrap="wrap"
              sx={{ mt: 3, rowGap: 1.2 }}
            >
              {FEATURE_CHIPS.map(({ icon: Icon, label }) => (
                <Chip
                  key={label}
                  icon={<Icon sx={{ fontSize: "18px !important", color: "#93C5FD !important" }} />}
                  label={label}
                  sx={{
                    background: "rgba(148,163,184,0.08)",
                    border: "1px solid rgba(148,163,184,0.16)",
                    color: "#CBD5E1",
                    fontWeight: 600,
                    fontSize: "0.78rem",
                    backdropFilter: "blur(8px)",
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Grow>

        <Fade in timeout={700}>
          <Paper
            elevation={8}
            sx={{
              p: 4,
              width: 400,
              maxWidth: "92vw",
              borderRadius: 4,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              background: "rgba(15,23,42,0.86)",
              border: "1px solid rgba(148,163,184,0.22)",
              boxShadow:
                "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(96,165,250,0.08)",
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, letterSpacing: 0.2, color: "#fff", textAlign: "center", mb: 0.5 }}
            >
              {entra.enabled
                ? "Sign in to continue"
                : isRegisterMode
                  ? "Create account"
                  : "Sign in"}
            </Typography>
            <Typography
              variant="body2"
              sx={{ opacity: 0.75, color: "#94A3B8", mt: 0.5, mb: 3, textAlign: "center" }}
            >
              {entra.enabled
                ? "Use your organization account to access the dashboard"
                : isRegisterMode
                  ? "Create a new local dashboard account"
                  : "Enter your credentials to continue"}
            </Typography>

            {error ? (
              <Alert severity="error" variant="filled" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            ) : null}

            {entra.enabled ? (
              <>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={!loading ? <MicrosoftIcon /> : null}
                  onClick={handleSignIn}
                  sx={{
                    py: 1.5,
                    borderRadius: 2.5,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    textTransform: "none",
                    fontSize: "1rem",
                    background:
                      "linear-gradient(135deg, rgba(25,118,210,0.9), rgba(0,172,193,0.9))",
                    color: "#fff",
                    boxShadow: "0 10px 28px rgba(0,0,0,0.3)",
                    transition: "transform .2s ease, box-shadow .2s ease",
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, rgba(25,118,210,1), rgba(0,172,193,1))",
                      transform: "translateY(-1px)",
                      boxShadow: "0 14px 32px rgba(0,0,0,0.38)",
                    },
                  }}
                >
                  Continue with Microsoft
                </Button>
              </>
            ) : (
              <Box
                component="form"
                onSubmit={isRegisterMode ? handleRegister : handleSignIn}
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <TextField
                  label="Username"
                  variant="filled"
                  fullWidth
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.25)",
                    borderRadius: 2,
                  }}
                />
                <TextField
                  label="Password"
                  variant="filled"
                  type="password"
                  fullWidth
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.25)",
                    borderRadius: 2,
                  }}
                />
                {isRegisterMode ? (
                  <TextField
                    label="Confirm Password"
                    variant="filled"
                    type="password"
                    fullWidth
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    sx={{
                      backgroundColor: "rgba(255,255,255,0.25)",
                      borderRadius: 2,
                    }}
                  />
                ) : null}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={!loading ? <LoginIcon /> : null}
                  sx={{
                    py: 1.2,
                    borderRadius: 2.5,
                    fontWeight: 800,
                    letterSpacing: 0.3,
                    background:
                      "linear-gradient(135deg, rgba(25,118,210,0.9), rgba(0,172,193,0.9))",
                    color: "#fff",
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, rgba(25,118,210,1), rgba(0,172,193,1))",
                    },
                  }}
                >
                  {isRegisterMode ? "Create Account" : "Sign In"}
                </Button>
                <Button
                  type="button"
                  variant="text"
                  disabled={loading}
                  onClick={handleToggleMode}
                  sx={{
                    color: "#fff",
                    textTransform: "none",
                    fontWeight: 700,
                    opacity: 0.92,
                  }}
                >
                  {isRegisterMode
                    ? "Already have an account? Sign in"
                    : "Need an account? Register"}
                </Button>
              </Box>
            )}
          </Paper>
        </Fade>
      </Box>

      <LoadingOverlay
        open={loading}
        text={
          entra.enabled
            ? "Redirecting to Microsoft Entra..."
            : isRegisterMode
              ? "Creating your account..."
              : "Signing you in..."
        }
      />
    </Container>
  );
};

SignInPage.propTypes = {
  onSignInSuccess: PropTypes.func,
};

export default SignInPage;
