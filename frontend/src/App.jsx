import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  Backdrop,
  Box,
  CircularProgress,
  CssBaseline,
  Fade,
  LinearProgress,
  Paper,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import { keyframes } from "@mui/system";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";

import Dashboard from "./components/Dashboard/Dashboard";
import { NotificationProvider } from "./components/notifications/NotificationProvider";
import SignInPage from "./components/SignInPage/SignInPage";
import { DataProvider } from "./DataContext";
import authService from "./services/auth";

function ProtectedRoute({ authenticated, children }) {
  const location = useLocation();

  if (!authenticated) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return children;
}

function SplashScreen({ text = "Getting things ready..." }) {
  const glow = useMemo(
    () => keyframes`
      0%, 100% { opacity: .55; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.08); }
    `,
    []
  );
  const tips = [
    "Access is managed through Microsoft Entra sign-in.",
    "You can deep-link into protected pages and return to where you were.",
    "Your session restores automatically when your Microsoft session is still active.",
    "Dark mode is fully supported.",
  ];
  const tipIndex = Math.floor(Date.now() / 3000) % tips.length;

  return (
    <Backdrop
      open
      sx={{
        color: "#fff",
        zIndex: (t) => t.zIndex.modal + 1,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        background:
          "radial-gradient(circle at 15% 15%, #131B33 0%, #0B1020 45%, #060911 100%)",
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <Fade in timeout={400}>
        <Paper
          elevation={10}
          role="status"
          sx={{
            px: 4,
            py: 4.5,
            width: 420,
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
              aria-label="Atlas Dashboard"
            >
              <MonitorHeartRoundedIcon sx={{ fontSize: 36, color: "#0B1020" }} />
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <CircularProgress thickness={4.5} size={38} sx={{ color: "#60A5FA" }} />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2, color: "#fff" }}>
            {text}
          </Typography>
          <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5 }}>
            {tips[tipIndex]}
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
}

ProtectedRoute.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

const appShellTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#60A5FA" },
    secondary: { main: "#34D399" },
    background: {
      default: "#0B1020",
      paper: "#0F172A",
    },
    text: {
      primary: "#E5E7EB",
      secondary: "#94A3B8",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const App = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    authService
      .initialize()
      .then((ok) => {
        if (isMounted) {
          setAuthenticated(ok);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignInSuccess = () => setAuthenticated(true);

  const handleSignOut = async () => {
    try {
      await authService.logout();
    } finally {
      setAuthenticated(false);
    }
  };

  return (
    <ThemeProvider theme={appShellTheme}>
      <CssBaseline />
      {loading ? (
        <SplashScreen text="Checking your session..." />
      ) : (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route
              path="/signin"
              element={
                authenticated ? (
                  <Navigate to="/home" replace />
                ) : (
                  <SignInPage onSignInSuccess={handleSignInSuccess} />
                )
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute authenticated={authenticated}>
                  <DataProvider>
                    <NotificationProvider>
                      <Dashboard onSignOut={handleSignOut} />
                    </NotificationProvider>
                  </DataProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      )}
    </ThemeProvider>
  );
};

export default App;
