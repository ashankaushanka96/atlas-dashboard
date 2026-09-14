import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Checkbox,
  FormControl,
  Grid,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import RoomOutlinedIcon from "@mui/icons-material/RoomOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import { useSearchParams } from "react-router-dom";
import { API } from "../../services/auth";
import useWidgetData from "./useWidgetData";
import hexToRgb from "../shared/hexToRgb";

const selectIconSx = (color) => ({ fontSize: 16, color });

function themedSelectSx(accentColor, isActive) {
  const accentRgb = hexToRgb(accentColor);
  return {
    minWidth: 170,
    maxWidth: 220,
    alignSelf: { xs: "stretch", md: "center" },
    "& .MuiSelect-select": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      paddingTop: "7px",
      paddingBottom: "7px",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderRadius: 999,
      borderColor: isActive ? `rgba(${accentRgb}, 0.5)` : "rgba(148, 163, 184, 0.32)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: `rgba(${accentRgb}, 0.7)`,
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: accentColor,
    },
  };
}

function themedMenuProps(accentColor) {
  const accentRgb = hexToRgb(accentColor);
  return {
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
          bgcolor: `rgba(${accentRgb}, 0.12)`,
        },
        "& .MuiMenuItem-root.Mui-selected": {
          bgcolor: `rgba(${accentRgb}, 0.16)`,
          color: accentColor,
          fontWeight: 600,
        },
        "& .MuiMenuItem-root.Mui-selected:hover": {
          bgcolor: `rgba(${accentRgb}, 0.24)`,
        },
      },
    },
  };
}
import PlatformWidget from "./widgets/PlatformWidget";
import PipelineWidget from "./widgets/PipelineWidget";
import WatcherWidget from "./widgets/WatcherWidget";
import EC2StatusWidget from "./widgets/EC2StatusWidget";
import InfrastructureFootprintWidget from "./widgets/InfrastructureFootprintWidget";
import HostOsWidget from "./widgets/HostOsWidget";
import HostComplianceWidget from "./widgets/HostComplianceWidget";
import HostWatcherStatusWidget from "./widgets/HostWatcherStatusWidget";

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || "");
  const [selectedAssetCustodians, setSelectedAssetCustodians] = useState(
    searchParams.getAll("assetCustodian")
  );

  useEffect(() => {
    const urlRegion = searchParams.get("region") || "";
    const urlAssetCustodians = searchParams.getAll("assetCustodian");

    setSelectedRegion((currentRegion) => (currentRegion === urlRegion ? currentRegion : urlRegion));
    setSelectedAssetCustodians((currentValues) =>
      currentValues.length === urlAssetCustodians.length &&
      currentValues.every((value, index) => value === urlAssetCustodians[index])
        ? currentValues
        : urlAssetCustodians
    );
  }, [searchParams]);

  useEffect(() => {
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        if (selectedRegion) nextParams.set("region", selectedRegion);
        else nextParams.delete("region");
        nextParams.delete("assetCustodian");
        selectedAssetCustodians.forEach((value) => nextParams.append("assetCustodian", value));
        return nextParams.toString() === currentParams.toString() ? currentParams : nextParams;
      },
      { replace: true }
    );
  }, [selectedRegion, selectedAssetCustodians, setSearchParams]);

  const loadRegions = useCallback(async () => {
    const resp = await API.get("/components/fetch-all-regions");
    const regions = resp.data.regions || [];
    return regions.filter(Boolean);
  }, []);

  const {
    loading: regionsLoading,
    error: regionsError,
    data: regionsData,
  } = useWidgetData(loadRegions);

  const regions = useMemo(() => regionsData || [], [regionsData]);

  const loadAssetCustodians = useCallback(async () => {
    const resp = await API.get("/server-details/fetch-asset-custodians");
    return resp.data.asset_custodians || [];
  }, []);

  const {
    loading: assetCustodiansLoading,
    error: assetCustodiansError,
    data: assetCustodiansData,
  } = useWidgetData(loadAssetCustodians);

  const assetCustodians = useMemo(() => assetCustodiansData || [], [assetCustodiansData]);

  const handleAssetCustodianChange = (event) => {
    const { value } = event.target;
    const values = typeof value === "string" ? value.split(",") : value;
    // Picking "All Asset Custodians" clears the selection instead of adding
    // "" as one more filter value.
    setSelectedAssetCustodians(values.includes("") ? [] : values);
  };

  return (
    <Box>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "background.default",
          px: 2,
          pt: 2,
          pb: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <HomeRoundedIcon sx={{ color: "#60A5FA" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Home
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <FormControl size="small" sx={themedSelectSx("#60A5FA", Boolean(selectedRegion))}>
            <Select
              displayEmpty
              value={selectedRegion}
              onChange={(event) => setSelectedRegion(event.target.value)}
              disabled={regionsLoading}
              inputProps={{ "aria-label": "Region" }}
              MenuProps={themedMenuProps("#60A5FA")}
              renderValue={(selected) => (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <RoomOutlinedIcon sx={selectIconSx("#60A5FA")} />
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ fontWeight: selected ? 600 : 400, color: selected ? "text.primary" : "text.secondary" }}
                  >
                    {selected || "All Regions"}
                  </Typography>
                </Stack>
              )}
            >
              <MenuItem value="">All Regions</MenuItem>
              {regions.map((region) => (
                <MenuItem key={region} value={region}>
                  {region}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            size="small"
            sx={themedSelectSx("#A78BFA", selectedAssetCustodians.length > 0)}
          >
            <Select
              displayEmpty
              multiple
              value={selectedAssetCustodians}
              onChange={handleAssetCustodianChange}
              disabled={assetCustodiansLoading}
              inputProps={{ "aria-label": "Asset Custodian" }}
              MenuProps={themedMenuProps("#A78BFA")}
              renderValue={(selected) => (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Groups2OutlinedIcon sx={selectIconSx("#A78BFA")} />
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ fontWeight: selected.length ? 600 : 400, color: selected.length ? "text.primary" : "text.secondary" }}
                  >
                    {selected.length === 0 ? "All Asset Custodians" : selected.join(", ")}
                  </Typography>
                </Stack>
              )}
            >
              <MenuItem value="">
                <ListItemText primary="All Asset Custodians" />
              </MenuItem>
              {assetCustodians.map((value) => (
                <MenuItem key={value} value={value}>
                  <Checkbox
                    size="small"
                    checked={selectedAssetCustodians.includes(value)}
                    sx={{
                      p: 0.5,
                      color: `rgba(${hexToRgb("#A78BFA")}, 0.6)`,
                      "&.Mui-checked": { color: "#A78BFA" },
                    }}
                  />
                  <ListItemText primary={value} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {regionsError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {regionsError}
        </Alert>
      ) : null}
      {assetCustodiansError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {assetCustodiansError}
        </Alert>
      ) : null}
      </Box>

      <Box sx={{ px: 2, pb: 2, pt: 2 }}>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <PlatformWidget selectedRegion={selectedRegion} selectedAssetCustodians={selectedAssetCustodians} />
        </Grid>
        <Grid item xs={12} md={6}>
          <PipelineWidget selectedRegion={selectedRegion} selectedAssetCustodians={selectedAssetCustodians} />
        </Grid>
        <Grid item xs={12} md={6}>
          <WatcherWidget selectedRegion={selectedRegion} selectedAssetCustodians={selectedAssetCustodians} />
        </Grid>
        <Grid item xs={12} md={6}>
          <EC2StatusWidget selectedRegion={selectedRegion} selectedAssetCustodians={selectedAssetCustodians} />
        </Grid>
        <Grid item xs={12} md={6}>
          <HostOsWidget selectedRegion={selectedRegion} selectedAssetCustodians={selectedAssetCustodians} />
        </Grid>
        <Grid item xs={12} md={6}>
          <HostComplianceWidget selectedRegion={selectedRegion} selectedAssetCustodians={selectedAssetCustodians} />
        </Grid>
        <Grid item xs={12} md={6}>
          <HostWatcherStatusWidget selectedRegion={selectedRegion} selectedAssetCustodians={selectedAssetCustodians} />
        </Grid>
        <Grid item xs={12}>
          <InfrastructureFootprintWidget selectedRegion={selectedRegion} />
        </Grid>
      </Grid>
      </Box>
    </Box>
  );
}
