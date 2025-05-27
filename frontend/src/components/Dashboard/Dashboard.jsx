import PropTypes from "prop-types";
import { createTheme } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import { Tooltip } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import StorageIcon from "@mui/icons-material/Storage";
import ScheduleIcon from "@mui/icons-material/Schedule";
import RouteIcon from "@mui/icons-material/Route";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

import { AppProvider } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import { ThemeSwitcher } from "@toolpad/core"; // ← default theme toggle
import { useDemoRouter } from "@toolpad/core/internal";

import Content from "../Content/Content";

const NAVIGATION = [
  { segment: "components", title: "Components", icon: <StorageIcon /> },
  { segment: "schedule", title: "EC2 Schedules", icon: <ScheduleIcon /> },
  { segment: "ec2details", title: "EC2 Details", icon: <AccountBalanceIcon /> },
  { segment: "route53", title: "Route 53 Status", icon: <RouteIcon /> },
  { segment: "s3logs", title: "Server Start/Stop", icon: <DashboardIcon /> },
];

const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-toolpad-color-scheme",
  },
  colorSchemes: { light: true, dark: true },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 600,
      lg: 1200,
      xl: 1536,
    },
  },
});

function Dashboard({ window, onSignOut }) {
  const router = useDemoRouter("/components");
  const containerWindow = window ? window() : undefined;

  return (
    <AppProvider
      navigation={NAVIGATION}
      branding={{
        logo: <img src="images/gtn-logo.png" alt="GTN logo" />,
        title: "Feed Dashboard",
        homeUrl: "/components",
      }}
      router={router}
      theme={demoTheme}
      window={containerWindow}
    >
      <DashboardLayout
        slots={{
          toolbarActions: () => (
            <>
              {/* Your custom Sign Out button */}
              <Tooltip title="Sign Out">
                <IconButton color="inherit" onClick={onSignOut}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
              {/* Light/Dark mode toggle */}
              <ThemeSwitcher />
            </>
          ),
        }}
      >
        <Content pathname={router.pathname} />
      </DashboardLayout>
    </AppProvider>
  );
}

Dashboard.propTypes = {
  window: PropTypes.func,
  onSignOut: PropTypes.func.isRequired,
};

export default Dashboard;
