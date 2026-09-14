import PropTypes from "prop-types";
import React from "react";
import { createTheme } from "@mui/material/styles";
import hexToRgb from "../shared/hexToRgb";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Typography,
  Stack,
  ListItemIcon,
  Collapse,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SearchIcon from "@mui/icons-material/Search";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import PersonRemoveAlt1Icon from "@mui/icons-material/PersonRemoveAlt1";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import CloudRoundedIcon from "@mui/icons-material/CloudRounded";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import ComputerRoundedIcon from "@mui/icons-material/ComputerRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";

import { AppProvider } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import { ThemeSwitcher } from "@toolpad/core";

import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import ComponentDB from "../ComponentDB/ComponentDB";
import Pipelines from "../Pipelines/Pipelines";
import HostDetails from "../HostDetails/HostDetails";
import ServerHandler from "../ServerHandler/ServerHandler";
import EC2Schedules from "../EC2Schedules/EC2Schedules";
import AWSResources from "../AWSResources/AWSResources";
import Route53 from "../Route53/Route53";
import ComponentMap from "../ComponentMap/ComponentMap";
import Home from "../Home/Home";
import StatusChip from "../HostDetails/StatusChip";

import { API } from "../../services/auth";
import WatcherStatus from "../WatcherStatus/WatcherStatus";

// NEW: notifications
import { BellButton } from "../notifications/NotificationProvider";
import NotificationHistoryButton from "../notifications/NotificationHistoryButton";
import TestNotificationButton from "../notifications/TestNotificationButton";
import useBackgroundStatusNotifications from "../notifications/useBackgroundStatusNotifications";
import { entra, getSectionVisibility } from "../../config/config.js";

/*
  ✨ DESIGN NOTES (unchanged for brevity)
*/
const demoTheme = createTheme({
  cssVariables: { colorSchemeSelector: "data-toolpad-color-scheme" },
  colorSchemes: {
    light: {
      palette: {
        mode: "light",
        primary: { main: "#2563EB", contrastText: "#ffffff" },
        secondary: { main: "#22C55E", contrastText: "#ffffff" },
        background: { default: "#ffffff", paper: "#f9fafb" },
        divider: "rgba(0,0,0,0.12)",
        text: {
          primary: "#111827",
          secondary: "#374151",
          disabled: "rgba(0,0,0,0.38)",
        },
        action: {
          hover: "rgba(0,0,0,0.04)",
          selected: "rgba(0,0,0,0.08)",
          focus: "rgba(0,0,0,0.12)",
        },
      },
      components: {
        MuiPaper: {
          styleOverrides: {
            root: { borderRadius: 14, backgroundImage: "none" },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: { borderRadius: 16, backgroundImage: "none" },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backdropFilter: "saturate(120%) blur(6px)",
              backgroundColor: "rgba(255,255,255,0.8)",
              borderBottom: "1px solid rgba(0,0,0,0.12)",
            },
          },
        },
        MuiTextField: { styleOverrides: { root: { backgroundColor: "#fff" } } },
      },
    },
    dark: {
      palette: {
        mode: "dark",
        primary: { main: "#60A5FA", contrastText: "#0B1020" },
        secondary: { main: "#34D399", contrastText: "#0B1020" },
        background: { default: "#0B1020", paper: "#0F172A" },
        divider: "rgba(148,163,184,.24)",
        text: {
          primary: "#E5E7EB",
          secondary: "#94A3B8",
          disabled: "rgba(148,163,184,.5)",
        },
        action: {
          hover: "rgba(148,163,184,.08)",
          selected: "rgba(148,163,184,.12)",
          focus: "rgba(148,163,184,.16)",
        },
      },
      shadows: [
        "none",
        "0 1px 2px rgba(0,0,0,.25)",
        "0 2px 6px rgba(0,0,0,.28)",
        "0 8px 24px rgba(0,0,0,.30)",
        ...Array(21).fill("0 10px 30px rgba(0,0,0,.32)"),
      ],
      components: {
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 14,
              backgroundImage: "none",
              border: "1px solid rgba(148,163,184,.12)",
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 16,
              backgroundImage: "none",
              border: "1px solid rgba(148,163,184,.12)",
            },
          },
        },
        MuiAppBar: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: {
              backdropFilter: "saturate(120%) blur(6px)",
              backgroundColor: "rgba(2,6,23,.70)",
              borderBottom: "1px solid rgba(148,163,184,.12)",
            },
          },
        },
        MuiTextField: {
          defaultProps: { size: "small", variant: "outlined" },
          styleOverrides: {
            root: {
              backgroundColor: "rgba(15,23,42,.6)",
              "& fieldset": { borderColor: "rgba(148,163,184,.24)" },
              "&:hover fieldset": { borderColor: "rgba(148,163,184,.38)" },
            },
          },
        },
        MuiFormLabel: { styleOverrides: { root: { color: "#A3B2C7" } } },
        MuiListItemButton: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              "&.Mui-selected": {
                backgroundColor: "rgba(59,130,246,.16)",
                "&:hover": { backgroundColor: "rgba(59,130,246,.22)" },
              },
            },
          },
        },
        MuiTooltip: { defaultProps: { arrow: true } },
        MuiButton: {
          styleOverrides: {
            containedPrimary: { color: "#0B1020" },
            containedSecondary: { color: "#0B1020" },
          },
        },
      },
    },
  },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
    h1: { fontWeight: 700, letterSpacing: -0.5 },
    h2: { fontWeight: 700, letterSpacing: -0.25 },
    h3: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
});

// getSectionVisibility now comes from centralized Config.js and uses runtime-only config

// Tinted icon-chip badge, same visual language as the rest of the app
// (StatusChip, HomeWidgetShell's icon badge): a rounded tile in a soft tint
// of the accent color with the icon in the full-strength color. Each nav
// item keeps its own accent so the collapsed rail stays easy to scan, but
// every accent is drawn from the app's shared hex palette instead of one-off
// colors, so the sidebar reads as part of the same design system.
const NavIcon = ({ Icon, color }) => (
  <Box
    sx={{
      width: 30,
      height: 30,
      borderRadius: 1.5,
      display: "grid",
      placeItems: "center",
      bgcolor: `rgba(${hexToRgb(color)}, 0.14)`,
      color,
      transition: "all 0.2s ease-in-out",
      "&:hover": {
        bgcolor: `rgba(${hexToRgb(color)}, 0.24)`,
        transform: "scale(1.06)",
      },
    }}
  >
    <Icon sx={{ fontSize: 18 }} />
  </Box>
);

NavIcon.propTypes = {
  Icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired,
};

const StyledDatabaseIcon = () => <NavIcon Icon={StorageRoundedIcon} color="#60A5FA" />;
const StyledPipelinesIcon = () => <NavIcon Icon={AltRouteRoundedIcon} color="#22D3EE" />;
const StyledHomeIcon = () => <NavIcon Icon={HomeRoundedIcon} color="#FF6B35" />;
const StyledVisibilityIcon = () => <NavIcon Icon={MonitorHeartRoundedIcon} color="#34D399" />;
const StyledAccountTreeIcon = () => <NavIcon Icon={AccountTreeRoundedIcon} color="#A78BFA" />;
const StyledTimerIcon = () => <NavIcon Icon={ScheduleIcon} color="#F59E0B" />;
const StyledCloudIcon = () => <NavIcon Icon={CloudRoundedIcon} color="#FACC15" />;
const StyledDnsIcon = () => <NavIcon Icon={DnsRoundedIcon} color="#E24B4A" />;
const StyledStorageIcon = () => <NavIcon Icon={TerminalRoundedIcon} color="#F87171" />;
const StyledHostDetailsIcon = () => <NavIcon Icon={ComputerRoundedIcon} color="#F472B6" />;

// Shared "always dark" dialog chrome for the account-menu admin dialogs
// (Role Assignments, Remove Mapping, Create User), matching the dark-gradient
// dialog recipe used by the section action modals (e.g. Watcher Actions).
const themedDialogPaperSx = {
  borderRadius: 3,
  background: "linear-gradient(180deg, rgba(10,18,31,0.98) 0%, rgba(15,23,42,0.98) 100%)",
  color: "white",
};

const themedDialogTitleSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
};

const themedDialogSectionSx = {
  border: "1px solid rgba(148, 163, 184, 0.16)",
  borderRadius: 2,
  p: 2,
  bgcolor: "rgba(255, 255, 255, 0.03)",
};

function themedFieldSx(accentColor) {
  const accentRgb = hexToRgb(accentColor);
  return {
    "& .MuiInputLabel-root": { color: "rgba(255, 255, 255, 0.7)" },
    "& .MuiOutlinedInput-root": {
      borderRadius: 999,
      color: "white",
      "& fieldset": { borderColor: "rgba(148, 163, 184, 0.32)" },
      "&:hover fieldset": { borderColor: `rgba(${accentRgb}, 0.7)` },
      "&.Mui-focused fieldset": { borderColor: accentColor },
    },
    "& .MuiSvgIcon-root": { color: "rgba(255, 255, 255, 0.6)" },
  };
}

const themedMenuPropsDark = {
  PaperProps: {
    sx: {
      mt: 1,
      borderRadius: "12px",
      bgcolor: "#0F172A",
      border: "1px solid rgba(148, 163, 184, 0.16)",
      "& .MuiMenuItem-root": { borderRadius: "8px", mx: 0.75, my: 0.15, fontSize: 13 },
    },
  },
};

const NAVIGATION = [
  { segment: "home", title: "Home", icon: <StyledHomeIcon /> },
  ...(getSectionVisibility().serverDetails ? [{ segment: "server-details", title: "Host Details", icon: <StyledHostDetailsIcon /> }] : []),
  ...(getSectionVisibility().componentDb ? [{ segment: "component-db", title: "Component DB", icon: <StyledDatabaseIcon /> }] : []),
  ...(getSectionVisibility().pipelines ? [{ segment: "pipelines", title: "Pipelines", icon: <StyledPipelinesIcon /> }] : []),
  ...(getSectionVisibility().componentWatcher ? [{
    segment: "component-watcher",
    title: "Watcher Status",
    icon: <StyledVisibilityIcon />,
  }] : []),
  ...(getSectionVisibility().componentMap ? [{
    segment: "component-map",
    title: "Component Map",
    icon: <StyledAccountTreeIcon />,
  }] : []),
  ...(getSectionVisibility().ec2Schedules ? [{ segment: "ec2-schedules", title: "EC2 Schedules", icon: <StyledTimerIcon /> }] : []),
  ...(getSectionVisibility().ec2Details ? [{
    segment: "infrastructure-details",
    title: "AWS Resources",
    icon: <StyledCloudIcon />,
  }] : []),
  ...(getSectionVisibility().route53Status ? [{ segment: "route53-status", title: "Route 53", icon: <StyledDnsIcon /> }] : []),
  ...(getSectionVisibility().serverHandler ? [{
    segment: "server-handler",
    title: "Server Handler",
    icon: <StyledStorageIcon />,
  }] : []),
];

function useToolpadRouterAdapter() {
  const navigate = useNavigate();
  const location = useLocation();
  return {
    pathname: location.pathname,
    navigate: (path) => {
      const abs = path?.startsWith("/") ? path : `/${path}`;
      navigate(abs);
    },
  };
}

function prettyPermission(name) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function Dashboard({ window, onSignOut }) {
  const router = useToolpadRouterAdapter();
  const containerWindow = window ? window() : undefined;
  const hoverExpandedSidebarRef = React.useRef(false);
  const [headerSearchValue, setHeaderSearchValue] = React.useState("");
  const [selectedHeaderSearchOption, setSelectedHeaderSearchOption] =
    React.useState(null);

  // background notifications (process/port changes)
  useBackgroundStatusNotifications();

  // Avatar menu
  const avatarButtonRef = React.useRef(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState(null);
  const [profileExpanded, setProfileExpanded] = React.useState(false);

  const handleAvatarClick = () => {
    if (avatarButtonRef.current) {
      const rect = avatarButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.right - 280,
      });
    }
    setMenuOpen(true);
    setProfileExpanded(false);
  };
  const handleCloseMenu = () => {
    setMenuOpen(false);
    setMenuPosition(null);
    setProfileExpanded(false);
  };

  // User state
  const [user, setUser] = React.useState(null);
  const [userError, setUserError] = React.useState(null);
  const [loadingUser, setLoadingUser] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await API.get("/auth/users/me");
        if (!active) return;
        setUser(data);
        setUserError(null);
      } catch (err) {
        if (!active) return;
        console.error("Failed to fetch user", err);
        setUserError("Failed to load profile");
      } finally {
        if (active) setLoadingUser(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const username = user?.display_name || user?.username || "";
  const avatarLetter =
    username?.trim()?.[0]?.toUpperCase() || (loadingUser ? "" : "A");

  const permissions = user?.role?.permissions || {};
  const entries = Object.entries(permissions);
  const canManageUsers = Boolean(permissions.user_management);
  const [roleManagerDialogOpen, setRoleManagerDialogOpen] = React.useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = React.useState(false);
  const [managedUsers, setManagedUsers] = React.useState([]);
  const [availableRoles, setAvailableRoles] = React.useState([]);
  const [rolePermissionsMap, setRolePermissionsMap] = React.useState({});
  const [roleSelections, setRoleSelections] = React.useState({});
  const [selectedManagedUsername, setSelectedManagedUsername] = React.useState(null);
  const [roleManagerLoading, setRoleManagerLoading] = React.useState(false);
  const [roleManagerError, setRoleManagerError] = React.useState(null);
  const [roleManagerSuccess, setRoleManagerSuccess] = React.useState(null);
  const [savingRoleFor, setSavingRoleFor] = React.useState(null);
  const [deletingUserFor, setDeletingUserFor] = React.useState(null);
  const [pendingDeleteUsername, setPendingDeleteUsername] = React.useState(null);
  const [createUserDialogOpen, setCreateUserDialogOpen] = React.useState(false);
  const [creatingUser, setCreatingUser] = React.useState(false);
  const [createUserForm, setCreateUserForm] = React.useState({
    username: "",
    password: "",
    confirmPassword: "",
    role: "viewer",
  });
  const managedUserSearchLabel = entra.enabled ? "Search Entra User" : "Search User";
  const managedUserSearchPlaceholder = entra.enabled
    ? "Type email or username"
    : "Type username";

  const headerSearchOptions = React.useMemo(
    () =>
      NAVIGATION.map((item) => {
        const aliasesBySegment = {
          home: ["dashboard", "overview"],
          "server-details": ["hosts", "servers", "host details"],
          "component-db": ["components", "database", "cmdb"],
          pipelines: ["pipeline", "repositories", "code repo"],
          "component-watcher": ["watcher", "status", "component status"],
          "component-map": ["map", "topology", "graph"],
          "ec2-schedules": ["schedules", "scheduler", "ec2"],
          "infrastructure-details": ["aws", "resources", "infrastructure"],
          "route53-status": ["dns", "route53", "route 53"],
          "server-handler": ["ssh", "terminal", "handler"],
        };

        return {
          label: item.title,
          segment: item.segment,
          keywords: [item.title, item.segment, ...(aliasesBySegment[item.segment] || [])],
          icon: item.icon,
        };
      }),
    [],
  );

  const navigateFromHeaderSearch = React.useCallback(
    (option) => {
      if (!option?.segment) {
        return;
      }
      router.navigate(`/${option.segment}`);
      setSelectedHeaderSearchOption(null);
      setHeaderSearchValue("");
    },
    [router],
  );

  const loadUsersWithRoles = React.useCallback(async () => {
    setRoleManagerLoading(true);
    setRoleManagerError(null);
    try {
      const { data } = await API.get("/auth/users/roles");
      const nextUsers = data.users || [];
      setManagedUsers(nextUsers);
      setAvailableRoles(data.available_roles || []);
      setRolePermissionsMap(
        Object.fromEntries(
          (data.role_permissions || []).map((item) => [item.name, item.permissions || {}])
        )
      );
      setRoleSelections(
        Object.fromEntries(nextUsers.map((item) => [item.username, item.role_name]))
      );
      setSelectedManagedUsername((prev) => {
        if (prev && nextUsers.some((item) => item.username === prev)) {
          return prev;
        }
        const firstEditableUser = nextUsers.find((item) => item.username !== username);
        return firstEditableUser?.username || nextUsers[0]?.username || null;
      });
    } catch (err) {
      setRoleManagerError(
        err.response?.data?.detail || "Failed to load users and roles"
      );
    } finally {
      setRoleManagerLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const view = containerWindow || globalThis.window;
    const doc = view?.document;
    if (!view || !doc) {
      return undefined;
    }

    const desktopMediaQuery = view.matchMedia("(min-width:900px)");
    const getDesktopSidebarPaper = () => {
      const dockedDrawers = Array.from(
        doc.querySelectorAll(".MuiDrawer-root.MuiDrawer-docked"),
      );
      const desktopDrawer = dockedDrawers[dockedDrawers.length - 1];
      return desktopDrawer?.querySelector(".MuiDrawer-paper") || null;
    };
    const getDesktopMenuButton = () =>
      Array.from(doc.querySelectorAll('button[aria-label$="navigation menu"]')).find(
        (button) => button.offsetParent !== null,
      ) || null;
    const isCollapsed = () => {
      const menuButton = getDesktopMenuButton();
      return Boolean(
        menuButton?.getAttribute("aria-label")?.toLowerCase().startsWith("expand"),
      );
    };

    const handleMouseEnter = () => {
      if (!desktopMediaQuery.matches || !isCollapsed()) {
        return;
      }
      const menuButton = getDesktopMenuButton();
      if (!menuButton) {
        return;
      }
      hoverExpandedSidebarRef.current = true;
      menuButton.click();
    };

    const handleMouseLeave = () => {
      if (!desktopMediaQuery.matches || !hoverExpandedSidebarRef.current) {
        return;
      }
      const menuButton = getDesktopMenuButton();
      if (!menuButton) {
        hoverExpandedSidebarRef.current = false;
        return;
      }
      const expanded = menuButton
        .getAttribute("aria-label")
        ?.toLowerCase()
        .startsWith("collapse");
      hoverExpandedSidebarRef.current = false;
      if (expanded) {
        menuButton.click();
      }
    };

    const bindHoverListeners = () => {
      const sidebarPaper = getDesktopSidebarPaper();
      if (!sidebarPaper) {
        return undefined;
      }
      sidebarPaper.addEventListener("mouseenter", handleMouseEnter);
      sidebarPaper.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        sidebarPaper.removeEventListener("mouseenter", handleMouseEnter);
        sidebarPaper.removeEventListener("mouseleave", handleMouseLeave);
      };
    };

    let unbind = bindHoverListeners();
    if (unbind) {
      return () => {
        unbind?.();
      };
    }

    const retryTimeout = view.setTimeout(() => {
      unbind = bindHoverListeners();
    }, 250);

    return () => {
      view.clearTimeout(retryTimeout);
      unbind?.();
    };
  }, [containerWindow]);

  const handleOpenRoleManager = async () => {
    setRoleManagerDialogOpen(true);
    setRoleManagerSuccess(null);
    if (managedUsers.length === 0 && !roleManagerLoading) {
      await loadUsersWithRoles();
    }
  };

  const handleCloseRoleManager = () => {
    setRoleManagerDialogOpen(false);
  };

  const handleOpenDeleteUserDialog = async () => {
    setDeleteUserDialogOpen(true);
    setRoleManagerSuccess(null);
    if (managedUsers.length === 0 && !roleManagerLoading) {
      await loadUsersWithRoles();
    }
  };

  const handleCloseDeleteUserDialog = () => {
    setDeleteUserDialogOpen(false);
  };

  const handleOpenCreateUserDialog = async () => {
    setCreateUserDialogOpen(true);
    setRoleManagerError(null);
    setRoleManagerSuccess(null);
    setCreateUserForm({
      username: "",
      password: "",
      confirmPassword: "",
      role: availableRoles[0] || "viewer",
    });
    if ((managedUsers.length === 0 || availableRoles.length === 0) && !roleManagerLoading) {
      await loadUsersWithRoles();
    }
  };

  const handleCloseCreateUserDialog = () => {
    if (creatingUser) {
      return;
    }
    setCreateUserDialogOpen(false);
  };

  const handleOpenDeleteConfirmation = (managedUsername) => {
    if (!managedUsername || managedUsername === username) {
      return;
    }
    setPendingDeleteUsername(managedUsername);
  };

  const handleCloseDeleteConfirmation = () => {
    if (deletingUserFor) {
      return;
    }
    setPendingDeleteUsername(null);
  };

  const handleRoleSelectionChange = (managedUsername, newRole) => {
    setRoleSelections((prev) => ({
      ...prev,
      [managedUsername]: newRole,
    }));
  };

  const selectedManagedUser = managedUsers.find(
    (item) => item.username === selectedManagedUsername
  ) || null;

  React.useEffect(() => {
    if (!createUserDialogOpen || availableRoles.length === 0) {
      return;
    }

    setCreateUserForm((prev) => {
      if (availableRoles.includes(prev.role)) {
        return prev;
      }
      return {
        ...prev,
        role: availableRoles[0],
      };
    });
  }, [availableRoles, createUserDialogOpen]);

  const handleSaveUserRole = async (managedUsername) => {
    const nextRole = roleSelections[managedUsername];
    if (!nextRole) {
      return;
    }

    setSavingRoleFor(managedUsername);
    setRoleManagerError(null);
    setRoleManagerSuccess(null);

    try {
      const { data } = await API.patch("/auth/user/role", {
        username: managedUsername,
        new_role: nextRole,
      });

      setManagedUsers((prev) =>
        prev.map((item) =>
          item.username === managedUsername
            ? { ...item, role_name: data.user_details.role.name }
            : item
        )
      );
      setRoleSelections((prev) => ({
        ...prev,
        [managedUsername]: data.user_details.role.name,
      }));
      setRoleManagerSuccess(`Role updated for ${managedUsername}`);

      if (managedUsername === username) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                role: data.user_details.role,
              }
            : prev
        );
      }
    } catch (err) {
      setRoleManagerError(
        err.response?.data?.detail || `Failed to update role for ${managedUsername}`
      );
    } finally {
      setSavingRoleFor(null);
    }
  };

  const handleDeleteUser = async (managedUsername) => {
    if (!managedUsername || managedUsername === username) {
      return;
    }

    setDeletingUserFor(managedUsername);
    setRoleManagerError(null);
    setRoleManagerSuccess(null);

    try {
      const { data } = await API.delete(
        `/auth/user/${encodeURIComponent(managedUsername)}`
      );

      const remainingUsers = managedUsers.filter(
        (item) => item.username !== managedUsername
      );
      setManagedUsers(remainingUsers);
      setRoleSelections((prev) => {
        const next = { ...prev };
        delete next[managedUsername];
        return next;
      });
      setSelectedManagedUsername((prev) => {
        if (prev !== managedUsername) {
          return prev;
        }
        const firstEditableUser = remainingUsers.find(
          (item) => item.username !== username
        );
        return firstEditableUser?.username || remainingUsers[0]?.username || null;
      });
      setRoleManagerSuccess(
        data.message || `Removed local role mapping for ${managedUsername}`,
      );
    } catch (err) {
      setRoleManagerError(
        err.response?.data?.detail ||
          `Failed to remove the local role mapping for ${managedUsername}`
      );
    } finally {
      setDeletingUserFor(null);
      setPendingDeleteUsername(null);
    }
  };

  const handleCreateUserFormChange = (field, value) => {
    setCreateUserForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateLocalUser = async () => {
    const nextUsername = createUserForm.username.trim();
    const nextPassword = createUserForm.password;
    const nextConfirmPassword = createUserForm.confirmPassword;
    const nextRole = createUserForm.role || availableRoles[0] || "viewer";

    if (!nextUsername || !nextPassword) {
      setRoleManagerError("Username and password are required.");
      return;
    }

    if (nextPassword !== nextConfirmPassword) {
      setRoleManagerError("Passwords do not match.");
      return;
    }

    setCreatingUser(true);
    setRoleManagerError(null);
    setRoleManagerSuccess(null);

    try {
      const { data } = await API.post("/auth/user/local", {
        username: nextUsername,
        password: nextPassword,
        role: nextRole,
      });

      const createdUser = {
        id: data.user_details.id,
        username: data.user_details.username,
        role_name: data.user_details.role.name,
      };
      const nextManagedUsers = [...managedUsers, createdUser].sort((a, b) =>
        a.username.localeCompare(b.username)
      );

      setManagedUsers(nextManagedUsers);
      setRoleSelections((prev) => ({
        ...prev,
        [createdUser.username]: createdUser.role_name,
      }));
      setSelectedManagedUsername(createdUser.username);
      setRoleManagerSuccess(data.message || `Local user created for ${nextUsername}`);
      setCreateUserDialogOpen(false);
      setCreateUserForm({
        username: "",
        password: "",
        confirmPassword: "",
        role: nextRole,
      });
    } catch (err) {
      setRoleManagerError(
        err.response?.data?.detail ||
          err.response?.data?.error_message ||
          `Failed to create local user ${nextUsername}`
      );
    } finally {
      setCreatingUser(false);
    }
  };

  // Debug logging for navigation

  return (
    <AppProvider
      navigation={NAVIGATION}
      branding={{
        logo: <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Atlas Dashboard logo" />,
        title: "Atlas Dashboard",
        homeUrl: "home",
      }}
      router={router}
      theme={demoTheme}
      window={containerWindow}
    >
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
          background:
            "linear-gradient(135deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 40%, rgba(23,37,84,1) 100%)",
        }}
      />

      <DashboardLayout
        defaultSidebarCollapsed
        sx={{
          "@media (min-width:900px)": {
            "& .MuiDrawer-root.MuiDrawer-docked": {
              width: "64px !important",
              flexShrink: 0,
            },
            "& .MuiDrawer-root.MuiDrawer-docked .MuiDrawer-paper": {
              boxShadow: "0 18px 48px rgba(2, 6, 23, 0.38)",
            },
          },
        }}
        slots={{
          toolbarActions: () => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TextField
                placeholder="Search…"
                sx={{ display: "none" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <Autocomplete
                size="small"
                options={headerSearchOptions}
                value={selectedHeaderSearchOption}
                inputValue={headerSearchValue}
                onInputChange={(_, nextValue, reason) => {
                  if (reason === "reset") {
                    setHeaderSearchValue("");
                    return;
                  }
                  setHeaderSearchValue(nextValue);
                }}
                onChange={(_, option) => {
                  navigateFromHeaderSearch(option);
                }}
                autoHighlight
                blurOnSelect
                clearOnBlur={false}
                sx={{
                  minWidth: 280,
                  display: { xs: "none", sm: "block" },
                  "& .MuiAutocomplete-popupIndicator": {
                    color: "text.secondary",
                  },
                }}
                getOptionLabel={(option) =>
                  typeof option === "string" ? option : option.label
                }
                isOptionEqualToValue={(option, value) =>
                  option.segment === value.segment
                }
                filterOptions={(options, state) => {
                  const query = state.inputValue.trim().toLowerCase();
                  if (!query) {
                    return options;
                  }
                  return options.filter((option) =>
                    option.keywords.some((keyword) =>
                      keyword.toLowerCase().includes(query),
                    ),
                  );
                }}
                renderOption={(props, option) => (
                  <Box
                    component="li"
                    {...props}
                    sx={{ display: "flex", alignItems: "center", gap: 1.25 }}
                  >
                    <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                      {option.icon}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {option.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.segment}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Jump to a section..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") {
                        return;
                      }
                      const query = headerSearchValue.trim().toLowerCase();
                      if (!query) {
                        return;
                      }
                      const exactMatch = headerSearchOptions.find((option) =>
                        option.keywords.some(
                          (keyword) => keyword.toLowerCase() === query,
                        ),
                      );
                      if (exactMatch) {
                        event.preventDefault();
                        navigateFromHeaderSearch(exactMatch);
                      }
                    }}
                  />
                )}
              />

              {/* Notifications */}
              <TestNotificationButton />
              <NotificationHistoryButton />
              <BellButton />

              <Box
                aria-label="Theme switcher"
                sx={{
                  display: "inline-flex",
                  borderRadius: 999,
                  bgcolor: `rgba(${hexToRgb("#F59E0B")}, 0.12)`,
                  "&:hover": { bgcolor: `rgba(${hexToRgb("#F59E0B")}, 0.22)` },
                  "& .MuiButtonBase-root": { color: "#F59E0B" },
                }}
              >
                <ThemeSwitcher />
              </Box>

              <Tooltip title={username || "Account"}>
                <Button
                  ref={avatarButtonRef}
                  onClick={handleAvatarClick}
                  variant="text"
                  sx={{
                    ml: 1,
                    px: 0.75,
                    py: 0.5,
                    minWidth: 0,
                    borderRadius: 999,
                    color: "text.primary",
                    textTransform: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <Avatar
                    src=""
                    alt={avatarLetter}
                    sx={{ width: 32, height: 32, fontSize: 14, fontWeight: 700 }}
                  >
                    {avatarLetter}
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      maxWidth: 140,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: { xs: "none", sm: "block" },
                    }}
                  >
                    {loadingUser ? "Loading..." : username || "Account"}
                  </Typography>
                  <KeyboardArrowDownRoundedIcon
                    sx={{
                      fontSize: 18,
                      color: "text.secondary",
                      display: { xs: "none", sm: "block" },
                    }}
                  />
                </Button>
              </Tooltip>

              {menuOpen && (
                <Menu
                  anchorReference="anchorPosition"
                  anchorPosition={menuPosition || undefined}
                  open={menuOpen}
                  onClose={handleCloseMenu}
                  keepMounted
                  PaperProps={{
                    sx: {
                      minWidth: 280,
                      p: 0.5,
                      mt: 1,
                      borderRadius: "14px",
                      border: "1px solid rgba(148, 163, 184, 0.16)",
                      "& .MuiMenuItem-root": { borderRadius: "8px", mx: 0.5, my: 0.15 },
                      "& .MuiMenuItem-root:hover": {
                        bgcolor: `rgba(${hexToRgb("#60A5FA")}, 0.1)`,
                      },
                    },
                  }}
                >
                  <MenuItem disabled sx={{ opacity: "1 !important" }}>
                    <Typography variant="caption" color="text.secondary">
                      {loadingUser
                        ? "Signing in…"
                        : userError
                          ? "Signed in"
                          : `Signed in as ${username}`}
                    </Typography>
                  </MenuItem>
                  <Divider />

                  <MenuItem
                    onClick={() => setProfileExpanded((v) => !v)}
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Profile</span>
                    {profileExpanded ? (
                      <ExpandLess sx={{ color: "#94A3B8" }} />
                    ) : (
                      <ExpandMore sx={{ color: "#94A3B8" }} />
                    )}
                  </MenuItem>

                  <Collapse in={profileExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ px: 2, pb: 1, pt: 0.5 }}>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <Avatar sx={{ width: 36, height: 36 }}>
                          {avatarLetter}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            noWrap
                            title={username}
                            sx={{ fontWeight: 600 }}
                          >
                            {username ||
                              (loadingUser ? "Loading…" : "Unknown user")}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                              Role:
                            </Typography>
                            <StatusChip
                              label={user?.role?.name || "N/A"}
                              color="#60A5FA"
                              Icon={BadgeOutlinedIcon}
                            />
                          </Stack>
                        </Box>
                      </Stack>

                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Permissions
                      </Typography>
                      <List
                        dense
                        disablePadding
                        sx={{ maxHeight: 240, overflowY: "auto" }}
                      >
                        {loadingUser && (
                          <ListItem>
                            <ListItemText primary="Loading permissions…" />
                          </ListItem>
                        )}
                        {!loadingUser && entries.length === 0 && (
                          <ListItem>
                            <ListItemText primary="No permissions" />
                          </ListItem>
                        )}
                        {!loadingUser &&
                          entries.map(([perm, allowed]) => (
                            <ListItem key={perm} sx={{ py: 0.25 }}>
                              <ListItemIcon sx={{ minWidth: 28 }}>
                                {allowed ? (
                                  <CheckCircleOutlineIcon fontSize="small" sx={{ color: "#34D399" }} />
                                ) : (
                                  <HighlightOffIcon fontSize="small" sx={{ color: "#E24B4A" }} />
                                )}
                              </ListItemIcon>
                              <ListItemText
                                primary={prettyPermission(perm)}
                                secondary={allowed ? "Allowed" : "Not allowed"}
                              />
                            </ListItem>
                          ))}
                      </List>
                    </Box>
                    <Divider sx={{ my: 0.5 }} />
                  </Collapse>

                  {canManageUsers ? (
                    <>
                      {!entra.enabled ? (
                        <MenuItem
                          onClick={() => {
                            handleCloseMenu();
                            handleOpenCreateUserDialog();
                          }}
                        >
                          <PersonAddAlt1Icon fontSize="small" sx={{ mr: 1.25, color: "#60A5FA" }} />
                          <span>Create Local User</span>
                        </MenuItem>
                      ) : null}
                      <MenuItem
                        onClick={() => {
                          handleCloseMenu();
                          handleOpenRoleManager();
                        }}
                      >
                        <ManageAccountsOutlinedIcon fontSize="small" sx={{ mr: 1.25, color: "#A78BFA" }} />
                        <span>Manage Local Roles</span>
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          handleCloseMenu();
                          handleOpenDeleteUserDialog();
                        }}
                      >
                        <PersonRemoveOutlinedIcon fontSize="small" sx={{ mr: 1.25, color: "#F59E0B" }} />
                        <span>Remove Local Role Mapping</span>
                      </MenuItem>
                    </>
                  ) : null}

                  <Divider />
                  <MenuItem
                    onClick={() => {
                      handleCloseMenu();
                      onSignOut();
                    }}
                  >
                    <LogoutIcon fontSize="small" sx={{ mr: 1.25, color: "#E24B4A" }} />
                    Sign out
                  </MenuItem>
                </Menu>
              )}
            </Box>
          ),
        }}
      >
        <Routes>
          <Route path="/home" element={<Home />} />
          {getSectionVisibility().componentDb && (
            <Route path="/component-db" element={<ComponentDB />} />
          )}
          {getSectionVisibility().pipelines && (
            <Route path="/pipelines" element={<Pipelines />} />
          )}
          {getSectionVisibility().serverDetails && (
            <Route path="/server-details" element={<HostDetails />} />
          )}
          {getSectionVisibility().serverHandler && (
            <Route path="/server-handler" element={<ServerHandler />} />
          )}
          {getSectionVisibility().ec2Schedules && (
            <>
              <Route path="/ec2-schedules" element={<Navigate to="/ec2-schedules/events" replace />} />
              <Route path="/ec2-schedules/:tab" element={<EC2Schedules />} />
            </>
          )}
          {getSectionVisibility().ec2Details && (
            <Route path="/infrastructure-details" element={<AWSResources />} />
          )}
          {getSectionVisibility().route53Status && (
            <Route path="/route53-status" element={<Route53 />} />
          )}
          {getSectionVisibility().componentMap && (
            <Route path="/component-map" element={<ComponentMap />} />
          )}
          {getSectionVisibility().componentWatcher && (
            <Route
              path="/component-watcher"
              element={<WatcherStatus />}
            />
          )}
          <Route path="*" element={<Navigate to={NAVIGATION.length > 0 ? `/${NAVIGATION[0].segment}` : "/component-db"} replace />} />
        </Routes>

        <Dialog
          open={roleManagerDialogOpen}
          onClose={handleCloseRoleManager}
          fullWidth
          maxWidth="sm"
          PaperProps={{ sx: themedDialogPaperSx }}
        >
          <DialogTitle sx={themedDialogTitleSx}>
            <ManageAccountsOutlinedIcon sx={{ color: "#A78BFA" }} />
            Local Role Assignments
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: "rgba(148, 163, 184, 0.16)" }}>
            {roleManagerLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : null}

            {roleManagerError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {roleManagerError}
              </Alert>
            ) : null}

            {roleManagerSuccess ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                {roleManagerSuccess}
              </Alert>
            ) : null}

            {!roleManagerLoading && managedUsers.length === 0 ? (
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                No local role mappings found.
              </Typography>
            ) : null}

            {!roleManagerLoading && managedUsers.length > 0 ? (
              <Stack spacing={2}>
                <Autocomplete
                  size="small"
                  options={managedUsers}
                  value={selectedManagedUser}
                  onChange={(_, nextUser) =>
                    setSelectedManagedUsername(nextUser?.username || null)
                  }
                  getOptionLabel={(option) => option?.username || ""}
                  isOptionEqualToValue={(option, value) =>
                    option.username === value.username
                  }
                  sx={themedFieldSx("#A78BFA")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={managedUserSearchLabel}
                      placeholder={managedUserSearchPlaceholder}
                    />
                  )}
                />

                {selectedManagedUser ? (() => {
                  const selectedRole =
                    roleSelections[selectedManagedUser.username] ||
                    selectedManagedUser.role_name;
                  const selectedRolePermissions =
                    Object.entries(rolePermissionsMap[selectedRole] || {});
                  const isSaving =
                    savingRoleFor === selectedManagedUser.username;
                  const isDeleting =
                    deletingUserFor === selectedManagedUser.username;
                  const isChanged =
                    selectedRole !== selectedManagedUser.role_name;
                  const isCurrentUser =
                    selectedManagedUser.username === username;

                  return (
                    <Box sx={themedDialogSectionSx}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, mb: 1 }}
                      >
                        {selectedManagedUser.username}
                      </Typography>

                      {isCurrentUser ? (
                        <Typography
                          variant="caption"
                          sx={{ display: "block", mb: 1.5, color: "rgba(255,255,255,0.6)" }}
                        >
                          Current signed-in user cannot be edited here.
                        </Typography>
                      ) : null}

                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 180, flexGrow: 1, ...themedFieldSx("#A78BFA") }}>
                          <InputLabel id="role-select-managed-user-dialog">
                            Role
                          </InputLabel>
                          <Select
                            labelId="role-select-managed-user-dialog"
                            value={selectedRole}
                            label="Role"
                            onChange={(event) =>
                              handleRoleSelectionChange(
                                selectedManagedUser.username,
                                event.target.value
                              )
                            }
                            disabled={isSaving || isDeleting || isCurrentUser}
                            MenuProps={themedMenuPropsDark}
                          >
                            {availableRoles.map((roleName) => (
                              <MenuItem key={roleName} value={roleName}>
                                {roleName}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <Button
                          variant="contained"
                          onClick={() =>
                            handleSaveUserRole(selectedManagedUser.username)
                          }
                          disabled={!isChanged || isSaving || isDeleting || isCurrentUser}
                          startIcon={
                            isSaving ? <CircularProgress size={16} color="inherit" /> : null
                          }
                          sx={{ borderRadius: 999, boxShadow: "none", flexShrink: 0 }}
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </Button>

                      </Stack>

                      <Box sx={{ mt: 2 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600, mb: 1.25 }}
                        >
                          Permissions for {selectedRole}
                        </Typography>
                        {selectedRolePermissions.length > 0 ? (
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {selectedRolePermissions.map(([permName, allowed]) => (
                              <StatusChip
                                key={permName}
                                label={prettyPermission(permName)}
                                color={allowed ? "#34D399" : "#94A3B8"}
                                Icon={allowed ? CheckCircleOutlineIcon : HighlightOffIcon}
                              />
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                            No permissions found for this role.
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })() : null}
              </Stack>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ borderTop: "1px solid rgba(148, 163, 184, 0.16)" }}>
            <Button onClick={handleCloseRoleManager} sx={{ color: "rgba(255,255,255,0.8)" }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={deleteUserDialogOpen}
          onClose={handleCloseDeleteUserDialog}
          fullWidth
          maxWidth="sm"
          PaperProps={{ sx: themedDialogPaperSx }}
        >
          <DialogTitle sx={themedDialogTitleSx}>
            <PersonRemoveOutlinedIcon sx={{ color: "#F59E0B" }} />
            Remove Local Role Mapping
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: "rgba(148, 163, 184, 0.16)" }}>
            {roleManagerLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : null}

            {roleManagerError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {roleManagerError}
              </Alert>
            ) : null}

            {roleManagerSuccess ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                {roleManagerSuccess}
              </Alert>
            ) : null}

            {!roleManagerLoading && managedUsers.length === 0 ? (
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                No local role mappings found.
              </Typography>
            ) : null}

            {!roleManagerLoading && managedUsers.length > 0 ? (
              <Stack spacing={2}>
                <Autocomplete
                  size="small"
                  options={managedUsers}
                  value={selectedManagedUser}
                  onChange={(_, nextUser) =>
                    setSelectedManagedUsername(nextUser?.username || null)
                  }
                  getOptionLabel={(option) => option?.username || ""}
                  isOptionEqualToValue={(option, value) =>
                    option.username === value.username
                  }
                  sx={themedFieldSx("#F59E0B")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={managedUserSearchLabel}
                      placeholder={managedUserSearchPlaceholder}
                    />
                  )}
                />

                {selectedManagedUser ? (() => {
                  const isDeleting =
                    deletingUserFor === selectedManagedUser.username;
                  const isCurrentUser =
                    selectedManagedUser.username === username;

                  return (
                    <Box sx={themedDialogSectionSx}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, mb: 1 }}
                      >
                        {selectedManagedUser.username}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{ mb: 2, color: "rgba(255,255,255,0.6)" }}
                      >
                        Current role: {selectedManagedUser.role_name}
                      </Typography>

                      {isCurrentUser ? (
                        <Typography
                          variant="caption"
                          sx={{ display: "block", mb: 1.5, color: "rgba(255,255,255,0.6)" }}
                        >
                          Current signed-in user cannot be removed here.
                        </Typography>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ mb: 2, color: "rgba(255,255,255,0.6)" }}
                        >
                          {entra.enabled
                            ? "This removes the backend role mapping only. The Microsoft Entra account is not deleted."
                            : "This removes the local dashboard user from backend access."}
                        </Typography>
                      )}

                      <Button
                        color="error"
                        variant="contained"
                        onClick={() =>
                          handleOpenDeleteConfirmation(selectedManagedUser.username)
                        }
                        disabled={isDeleting || isCurrentUser}
                        startIcon={
                          isDeleting ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <DeleteOutlineIcon fontSize="small" />
                          )
                        }
                        sx={{ borderRadius: 999, boxShadow: "none" }}
                      >
                        {isDeleting ? "Removing..." : "Remove Mapping"}
                      </Button>
                    </Box>
                  );
                })() : null}
              </Stack>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ borderTop: "1px solid rgba(148, 163, 184, 0.16)" }}>
            <Button onClick={handleCloseDeleteUserDialog} sx={{ color: "rgba(255,255,255,0.8)" }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={Boolean(pendingDeleteUsername)}
          onClose={handleCloseDeleteConfirmation}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: themedDialogPaperSx }}
        >
          <DialogTitle sx={themedDialogTitleSx}>
            <PersonRemoveAlt1Icon sx={{ color: "#E24B4A" }} />
            Confirm Local Mapping Removal
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: "rgba(148, 163, 184, 0.16)" }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Remove the local role mapping for &quot;{pendingDeleteUsername}&quot;?
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
              {entra.enabled
                ? "This does not delete the Microsoft Entra account. The user can sign in again and will be recreated with the default local role."
                : "This deletes the local dashboard user account and its current role assignment."}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ borderTop: "1px solid rgba(148, 163, 184, 0.16)" }}>
            <Button
              onClick={handleCloseDeleteConfirmation}
              disabled={Boolean(deletingUserFor)}
              sx={{ color: "rgba(255,255,255,0.8)" }}
            >
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => handleDeleteUser(pendingDeleteUsername)}
              disabled={!pendingDeleteUsername || Boolean(deletingUserFor)}
              startIcon={
                deletingUserFor ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <DeleteOutlineIcon fontSize="small" />
                )
              }
              sx={{ borderRadius: 999, boxShadow: "none" }}
            >
              {deletingUserFor ? "Removing..." : "Remove Mapping"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={createUserDialogOpen}
          onClose={handleCloseCreateUserDialog}
          fullWidth
          maxWidth="sm"
          PaperProps={{ sx: themedDialogPaperSx }}
        >
          <DialogTitle sx={themedDialogTitleSx}>
            <PersonAddAlt1Icon sx={{ color: "#60A5FA" }} />
            Create Local User
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: "rgba(148, 163, 184, 0.16)" }}>
            {roleManagerError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {roleManagerError}
              </Alert>
            ) : null}

            {roleManagerSuccess ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                {roleManagerSuccess}
              </Alert>
            ) : null}

            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <TextField
                autoFocus
                size="small"
                label="Username"
                value={createUserForm.username}
                onChange={(event) =>
                  handleCreateUserFormChange("username", event.target.value)
                }
                disabled={creatingUser}
                sx={themedFieldSx("#60A5FA")}
              />

              <FormControl size="small" fullWidth sx={themedFieldSx("#60A5FA")}>
                <InputLabel id="create-local-user-role-label">Role</InputLabel>
                <Select
                  labelId="create-local-user-role-label"
                  value={createUserForm.role}
                  label="Role"
                  onChange={(event) =>
                    handleCreateUserFormChange("role", event.target.value)
                  }
                  disabled={creatingUser}
                  MenuProps={themedMenuPropsDark}
                >
                  {availableRoles.map((roleName) => (
                    <MenuItem key={roleName} value={roleName}>
                      {roleName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                type="password"
                label="Password"
                value={createUserForm.password}
                onChange={(event) =>
                  handleCreateUserFormChange("password", event.target.value)
                }
                disabled={creatingUser}
                sx={themedFieldSx("#60A5FA")}
              />

              <TextField
                size="small"
                type="password"
                label="Confirm Password"
                value={createUserForm.confirmPassword}
                onChange={(event) =>
                  handleCreateUserFormChange("confirmPassword", event.target.value)
                }
                disabled={creatingUser}
                sx={themedFieldSx("#60A5FA")}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ borderTop: "1px solid rgba(148, 163, 184, 0.16)" }}>
            <Button
              onClick={handleCloseCreateUserDialog}
              disabled={creatingUser}
              sx={{ color: "rgba(255,255,255,0.8)" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateLocalUser}
              disabled={creatingUser}
              startIcon={
                creatingUser ? <CircularProgress size={16} color="inherit" /> : null
              }
              sx={{ borderRadius: 999, boxShadow: "none" }}
            >
              {creatingUser ? "Creating..." : "Create User"}
            </Button>
          </DialogActions>
        </Dialog>
      </DashboardLayout>
    </AppProvider>
  );
}

Dashboard.propTypes = {
  window: PropTypes.func,
  onSignOut: PropTypes.func.isRequired,
};

export default Dashboard;
