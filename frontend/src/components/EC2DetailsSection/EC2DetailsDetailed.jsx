// EC2DetailsDetailed.jsx
import React, { useState, useEffect } from "react";
import { Box, Typography, Grid, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { backendDomain } from "../../Config";
import PropTypes from "prop-types";
import axios from "axios";

// Common style for section boxes.
const sectionBoxStyle = {
  p: 2,
  borderRadius: "8px",
  border: "2px dotted",
  mb: 2,
};

// Helper for main instance status box color.
const getStatusBoxColor = (status, theme) => {
  if (status) {
    const lower = status.toLowerCase();
    if (lower === "running") return theme.palette.success.main;
    if (lower === "stopped") return theme.palette.error.main;
    if (lower === "terminated") return theme.palette.warning.main;
  }
  return theme.palette.grey[500];
};

// Helper for status check box color.
const getCheckBoxColor = (value, expected, theme) =>
  value && value.toLowerCase() === expected.toLowerCase()
    ? theme.palette.success.main
    : theme.palette.error.main;

const EC2DetailsDetailed = ({ region, instance_id, ip }) => {
  const theme = useTheme();
  const [ec2Details, setEC2Details] = useState({});
  const [loadingEC2Details, setLoadingEC2Details] = useState(true);
  const [errorEC2Details, setErrorEC2Details] = useState(null);
  const [components, setComponents] = useState([]);
  const [loadingComponents, setLoadingComponents] = useState(true);
  const [errorComponents, setErrorComponents] = useState(null);

  // Fetch details from backend when component mounts.
  const fetchEC2InstancesDetails = async (region, instance_id) => {
    setLoadingEC2Details(true);
    const url = `${backendDomain}/ec2-details/fetch-instance-details`;
    try {
      const response = await axios.get(url, {
        params: { region: region, instance_id: instance_id },
      });
      setEC2Details(response.data.instance_details);
    } catch (err) {
      setErrorEC2Details(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
    } finally {
      setLoadingEC2Details(false);
    }
  };

  const fetchComponents = async (ip) => {
    setLoadingComponents(true);
    const url = `${backendDomain}/ec2-details/fetch-component-names`;
    try {
      const response = await axios.get(url, {
        params: { ip: ip },
      });
      setComponents(response.data.component_names);
    } catch (err) {
      setErrorComponents(
        err.response?.data?.error_message || "An unexpected error occurred"
      );
    } finally {
      setLoadingComponents(false);
    }
  };
  useEffect(() => {
    fetchEC2InstancesDetails(region, instance_id);
  }, [region, instance_id]);

  useEffect(() => {
    fetchComponents(ip);
  }, [ip]);

  return (
    <Box>
      <Typography variant="h5" sx={{ color: "secondary.main", mb: 2 }}>
        Detailed Instance Information
      </Typography>
      <Grid container spacing={2}>
        {/* Instance Details Section */}
        <Grid item xs={12} md={6}>
          <Box sx={sectionBoxStyle}>
            <Typography variant="h6" sx={{ color: "primary.main", mb: 1 }}>
              <strong>Instance Details</strong>
            </Typography>
            {loadingEC2Details ? (
              <CircularProgress size={20} />
            ) : ec2Details && ec2Details.instance_name ? (
              <>
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "140px",
                      fontWeight: "bold",
                    }}
                  >
                    Instance Name
                  </Box>
                  <strong>:</strong> {ec2Details.instance_name || "N/A"}
                </Typography>
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "140px",
                      fontWeight: "bold",
                    }}
                  >
                    Instance Type
                  </Box>
                  <strong>:</strong> {ec2Details.instance_type}
                </Typography>
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "140px",
                      fontWeight: "bold",
                    }}
                  >
                    Instance ID
                  </Box>
                  <strong>:</strong> {ec2Details.instance_id}
                </Typography>
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "140px",
                      fontWeight: "bold",
                    }}
                  >
                    Instance Status
                  </Box>
                  <Box sx={{ display: "inline-block" }}>
                    <Typography>
                      <strong>:</strong>
                      <Box
                        sx={{
                          backgroundColor: getStatusBoxColor(
                            ec2Details.instance_status,
                            theme
                          ),
                          padding: "0px 8px",
                          margin: "2px",
                          borderRadius: "4px",
                          display: "inline-block",
                          ml: 1,
                        }}
                      >
                        {ec2Details.instance_status}
                      </Box>
                    </Typography>
                  </Box>
                </Typography>
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "140px",
                      fontWeight: "bold",
                    }}
                  >
                    Instance Profile
                  </Box>
                  <strong>:</strong> {ec2Details.instance_profile || "N/A"}
                </Typography>
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "140px",
                      fontWeight: "bold",
                    }}
                  >
                    Launch Time
                  </Box>
                  <strong>:</strong> {ec2Details.launch_time}
                </Typography>
              </>
            ) : (
              <Typography>No Instance Details Available</Typography>
            )}
          </Box>
        </Grid>
        {/* Status Checks & AMI Details Section */}
        <Grid item xs={12} md={6}>
          <Box sx={sectionBoxStyle}>
            <Typography variant="h6" sx={{ color: "primary.main", mb: 1 }}>
              <strong>Status Checks</strong>
            </Typography>
            {loadingEC2Details ? (
              <CircularProgress size={20} />
            ) : ec2Details && ec2Details.status_checks ? (
              <>
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "200px",
                      fontWeight: "bold",
                    }}
                  >
                    System Status Check
                  </Box>
                  <strong>:</strong>
                  {ec2Details.status_checks.system_status_check ? (
                    <Box
                      sx={{
                        backgroundColor: getCheckBoxColor(
                          ec2Details.status_checks.system_status_check,
                          "ok",
                          theme
                        ),
                        padding: "0px 8px",
                        margin: "2px",
                        borderRadius: "4px",
                        display: "inline-block",
                        ml: 1,
                      }}
                    >
                      {ec2Details.status_checks.system_status_check}
                    </Box>
                  ) : (
                    " N/A"
                  )}
                </Typography>
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "200px",
                      fontWeight: "bold",
                    }}
                  >
                    Instance Status Check
                  </Box>
                  <strong>:</strong>
                  {ec2Details.status_checks.instance_status_check ? (
                    <Box
                      sx={{
                        backgroundColor: getCheckBoxColor(
                          ec2Details.status_checks.instance_status_check,
                          "ok",
                          theme
                        ),
                        padding: "0px 8px",
                        margin: "2px",
                        borderRadius: "4px",
                        display: "inline-block",
                        ml: 1,
                      }}
                    >
                      {ec2Details.status_checks.instance_status_check}
                    </Box>
                  ) : (
                    " N/A"
                  )}
                </Typography>
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "200px",
                      fontWeight: "bold",
                    }}
                  >
                    EBS Status Check
                  </Box>
                  <strong>:</strong>
                  {ec2Details.status_checks.attached_ebs_status_checks &&
                  ec2Details.status_checks.attached_ebs_status_checks.length >
                    0 ? (
                    <Box
                      sx={{
                        backgroundColor: getCheckBoxColor(
                          ec2Details.status_checks
                            .attached_ebs_status_checks[0],
                          "passed",
                          theme
                        ),
                        padding: "0px 8px",
                        margin: "2px",
                        borderRadius: "4px",
                        display: "inline-block",
                        ml: 1,
                      }}
                    >
                      {ec2Details.status_checks.attached_ebs_status_checks.join(
                        ", "
                      )}
                    </Box>
                  ) : (
                    " N/A"
                  )}
                </Typography>
              </>
            ) : (
              <Typography>No Status Checks Available</Typography>
            )}
          </Box>
          <Box sx={{ ...sectionBoxStyle, mt: 2 }}>
            <Typography variant="h6" sx={{ color: "primary.main", mb: 1 }}>
              <strong>AMI Details</strong>
            </Typography>
            {loadingEC2Details ? (
              <CircularProgress size={20} />
            ) : ec2Details && ec2Details.ami_details ? (
              <>
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "100px",
                      fontWeight: "bold",
                    }}
                  >
                    AMI ID
                  </Box>
                  <strong>:</strong> {ec2Details.ami_details.ami_id || "N/A"}
                </Typography>
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: "inline-block",
                      width: "100px",
                      fontWeight: "bold",
                    }}
                  >
                    AMI Name
                  </Box>
                  <strong>:</strong> {ec2Details.ami_details.ami_name || "N/A"}
                </Typography>
              </>
            ) : (
              <Typography>No AMI Details Available</Typography>
            )}
          </Box>
        </Grid>
        {/* Componnents Section */}
        <Grid item xs={12}>
          <Box sx={sectionBoxStyle}>
            <Typography variant="h6" sx={{ color: "primary.main", mb: 1 }}>
              <strong>Components</strong>
            </Typography>
            {loadingComponents ? (
              <CircularProgress size={20} />
            ) : components && components.length > 0 ? (
              <Grid container>
                {components.map((name, index) => (
                  <Grid item xs={6} key={index}>
                    <Typography>
                      <strong>{name}</strong>
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography>No Components Available</Typography>
            )}
          </Box>
        </Grid>
        {/* Network Details Section */}
        <Grid item xs={12}>
          <Box sx={sectionBoxStyle}>
            <Typography variant="h6" sx={{ color: "primary.main", mb: 1 }}>
              <strong>Network Details</strong>
            </Typography>
            {loadingEC2Details ? (
              <CircularProgress size={20} />
            ) : ec2Details && ec2Details.network_details ? (
              <>
                {/* VPC Name and VPC ID in two columns */}
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          fontWeight: "bold",
                          width: "150px",
                        }}
                      >
                        VPC Name
                      </Box>
                      <strong>:</strong>{" "}
                      {ec2Details.network_details.vpc_name || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          fontWeight: "bold",
                          width: "100px",
                        }}
                      >
                        VPC ID
                      </Box>
                      <strong>:</strong>{" "}
                      {ec2Details.network_details.vpc_id || "N/A"}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Subnet Name and Subnet ID in two columns */}
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          fontWeight: "bold",
                          width: "150px",
                        }}
                      >
                        Subnet Name
                      </Box>
                      <strong>:</strong>{" "}
                      {ec2Details.network_details.subnet_name || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          fontWeight: "bold",
                          width: "100px",
                        }}
                      >
                        Subnet ID
                      </Box>
                      <strong>:</strong>{" "}
                      {ec2Details.network_details.subnet_id || "N/A"}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Security Groups */}
                <Typography variant="subtitle1" sx={{ mt: 1 }}>
                  <strong>Security Groups:</strong>
                </Typography>
                <Grid container>
                  {ec2Details.network_details.security_group_name &&
                    ec2Details.network_details.security_group_name.map(
                      (sg, index) => (
                        <React.Fragment key={index}>
                          <Grid item xs={6}>
                            <Typography>
                              <strong>Name:</strong> {sg}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography>
                              <strong>ID:</strong>{" "}
                              {
                                ec2Details.network_details.security_group_id[
                                  index
                                ]
                              }
                            </Typography>
                          </Grid>
                        </React.Fragment>
                      )
                    )}
                </Grid>
              </>
            ) : (
              <Typography>No Network Details Available</Typography>
            )}
          </Box>
        </Grid>
        {/* Storages Section */}
        <Grid item xs={12}>
          <Box sx={sectionBoxStyle}>
            <Typography variant="h6" sx={{ color: "primary.main", mb: 1 }}>
              <strong>Storages</strong>
            </Typography>
            {loadingEC2Details ? (
              <CircularProgress size={20} />
            ) : ec2Details && ec2Details.storages ? (
              ec2Details.storages.map((storage, index) => (
                <Grid container spacing={2} key={index}>
                  <Grid item xs={4}>
                    <Typography>
                      <strong>DeviceName:</strong> {storage.DeviceName}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography>
                      <strong>VolumeId:</strong> {storage.Ebs.VolumeId}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography>
                      <strong>VolumeSize:</strong> {storage.Ebs.Size} GB
                    </Typography>
                  </Grid>
                </Grid>
              ))
            ) : (
              <Typography>No Storages Available</Typography>
            )}
          </Box>
        </Grid>
        {/* Instance Tags Section */}
        <Grid item xs={12}>
          <Box sx={sectionBoxStyle}>
            <Typography variant="h6" sx={{ color: "primary.main", mb: 1 }}>
              <strong>Instance Tags</strong>
            </Typography>
            {loadingEC2Details ? (
              <CircularProgress size={20} />
            ) : ec2Details && ec2Details.tags ? (
              <Grid container>
                {ec2Details.tags.map((tag, index) => (
                  <Grid item xs={6} key={index}>
                    <Typography>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          fontWeight: "bold",
                          width: "185px",
                        }}
                      >
                        {tag.Key}
                      </Box>
                      <strong>:</strong> {tag.Value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography>No Tags Available</Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

EC2DetailsDetailed.propTypes = {
  region: PropTypes.string.isRequired,
  instance_id: PropTypes.string.isRequired,
  ip: PropTypes.string.isRequired,
};

export default EC2DetailsDetailed;
