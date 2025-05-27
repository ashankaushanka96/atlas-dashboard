// src/components/ComponentDetailsDetailed.jsx
import React from "react";
import { Box, Typography, Grid, IconButton } from "@mui/material";
import PropTypes from "prop-types";
import LaunchIcon from "@mui/icons-material/Launch";

const sectionBoxStyle = { p: 1 };

function ComponentDetailsDetailed({ comp }) {
  return (
    <Grid container spacing={1}>
      {/* Simple fields */}
      {[
        ["Previous Tag", comp.previous_tag],
        ["Release Date", comp.release_date],
        ["Last Ran Time", comp.last_run_time],
        ["Component Updated Time", comp.last_update_time],
      ].map(([label, value]) => (
        <Grid item xs={12} key={label}>
          <Box sx={sectionBoxStyle}>
            <Typography variant="body2">
              <Box
                component="span"
                sx={{
                  fontWeight: "bold",
                  width: "250px",
                  display: "inline-block",
                }}
              >
                {label}
              </Box>
              <strong>:</strong> {value || "N/A"}
            </Typography>
          </Box>
        </Grid>
      ))}

      {/* URL fields with clickable icon */}
      {[
        ["Code Repo URL", comp.code_repo_url],
        ["Config Repo URL", comp.config_repo_url],
        ["Script Repo URL", comp.script_repo_url],
      ].map(([label, value]) => (
        <Grid item xs={12} key={label}>
          <Box sx={sectionBoxStyle}>
            <Typography variant="body2" component="div">
              <Box
                component="span"
                sx={{
                  fontWeight: "bold",
                  width: "250px",
                  display: "inline-block",
                }}
              >
                {label}
              </Box>
              <strong>:</strong>
              {value ? (
                <Box
                  component="span"
                  sx={{ ml: 1, display: "inline-flex", alignItems: "center" }}
                >
                  {value}
                  <IconButton
                    size="small"
                    component="a"
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ ml: 0.5 }}
                  >
                    <LaunchIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                " N/A"
              )}
            </Typography>
          </Box>
        </Grid>
      ))}

      {/* Full-width description box */}
      <Grid item xs={12}>
        <Box
          sx={{ p: 1, mt: 0.5, borderTop: "1px solid", borderColor: "divider" }}
        >
          <Typography variant="body2">
            <Box
              component="span"
              sx={{ fontWeight: "bold", display: "inline-block", mr: 1 }}
            >
              Description:
            </Box>
            {comp.description || "N/A"}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
}

ComponentDetailsDetailed.propTypes = {
  comp: PropTypes.shape({
    comp_version: PropTypes.string.isRequired,
    pipeline: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
    ip: PropTypes.string.isRequired,
    component_name: PropTypes.string.isRequired,
    platform: PropTypes.string.isRequired,
    comp_path: PropTypes.string.isRequired,
    last_run_time: PropTypes.string.isRequired,
    last_update_time: PropTypes.string.isRequired,
    previous_tag: PropTypes.string.isRequired,
    release_date: PropTypes.string.isRequired,
    code_repo_url: PropTypes.string.isRequired,
    config_repo_url: PropTypes.string.isRequired,
    script_repo_url: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
};

export default ComponentDetailsDetailed;
