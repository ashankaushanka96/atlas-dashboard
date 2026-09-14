import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Grid,
  Paper,
  Chip,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Security as SecurityIcon,
  Label as LabelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Apps as AppsIcon,
  ContentCopy as ContentCopyIcon,
  HourglassEmpty as HourglassEmptyIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { API } from '../../../services/auth';
import DetailSkeleton, { InlineTableSkeleton } from './DetailSkeleton';
import StatusChip from '../../HostDetails/StatusChip';
import hexToRgb from '../../shared/hexToRgb';
import { getPlatformConfig } from '../../ComponentDB/componentStatusConfig';

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
});

function getLifecycleStatusConfig(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (['running', 'ok', 'passed'].includes(normalized)) return { color: '#34D399', Icon: CheckCircleIcon };
  if (['stopped', 'terminated'].includes(normalized)) return { color: '#E24B4A', Icon: ErrorIcon };
  if (['pending', 'stopping', 'starting'].includes(normalized)) return { color: '#F59E0B', Icon: HourglassEmptyIcon };
  if (!normalized || normalized === 'n/a') return { color: '#94A3B8', Icon: HelpOutlineIcon };
  return { color: '#94A3B8', Icon: HelpOutlineIcon };
}

function getYesNoConfig(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'yes' || normalized === 'configured') return { color: '#34D399', Icon: CheckCircleIcon };
  if (normalized === 'no' || normalized === 'unconfigured') return { color: '#E24B4A', Icon: ErrorIcon };
  return { color: '#94A3B8', Icon: HelpOutlineIcon };
}

const EC2DetailModal = ({ open, onClose, data: initialData }) => {
  // Create a unique key for each instance to force re-render
  const instanceKey = initialData?.instance_id || 'default';
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [components, setComponents] = useState([]);
  const [componentsLoading, setComponentsLoading] = useState(false);
  const [componentsError, setComponentsError] = useState(null);
  const lastFetchedIpRef = useRef(null);

  useEffect(() => {
    if (!open || !initialData) {
      return;
    }

    // Reset components state when modal opens
    setComponents([]);
    setComponentsLoading(false);
    setComponentsError(null);
    lastFetchedIpRef.current = null;

    let cancelled = false;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        setDetails(null);

        const region = initialData.region;
        const instance_id = initialData.instance_id;
        const { data: resp } = await API.get(`/ec2-details/fetch-instance-details`, {
          params: { region, instance_id },
        });
        
        if (!cancelled) {
          setDetails(resp.instance_details);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.detail || 'Failed to fetch EC2 details');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [open, initialData]);

  // Create a stable fetchComponents function
  const fetchComponents = useCallback(async (privateIp, region) => {
    try {
      setComponentsLoading(true);
      setComponentsError(null);
      setComponents([]);

      const { data: resp } = await API.get('/components/fetch-components-by-ip', {
        params: { 
          ip: privateIp,
          region: region 
        }
      });
      
      // Handle the response structure with status_code and components
      let componentsData = [];
      if (resp && resp.components && Array.isArray(resp.components)) {
        componentsData = resp.components;
      } else if (resp && Array.isArray(resp)) {
        componentsData = resp;
      } else if (resp && resp.data && Array.isArray(resp.data)) {
        componentsData = resp.data;
      }
      
      setComponents(componentsData);
      lastFetchedIpRef.current = privateIp;
      setComponentsLoading(false);
    } catch (e) {
      console.error('Components fetch error:', e);
      setComponentsError(e.response?.data?.detail || 'Failed to fetch components');
      setComponentsLoading(false);
    }
  }, []);

  // Fetch components when details are loaded
  useEffect(() => {
    const currentData = details || initialData;
    
    if (!currentData || !currentData.region) {
      setComponentsLoading(false);
      return;
    }

    // Try to get private IP from different possible locations
    let privateIp = null;
    if (currentData.network_details?.private_ip) {
      privateIp = currentData.network_details.private_ip;
    } else if (currentData.private_ip) {
      privateIp = currentData.private_ip;
    } else if (currentData.private_ips && currentData.private_ips.length > 0) {
      privateIp = currentData.private_ips[0];
    }

    if (!privateIp) {
      setComponentsLoading(false);
      return;
    }

    // Only fetch if we haven't already fetched components for this IP
    if (lastFetchedIpRef.current === privateIp) {
      return;
    }

    // Fetch components
    fetchComponents(privateIp, currentData.region);
  }, [details?.instance_id, initialData?.instance_id, fetchComponents]); // Include fetchComponents in dependencies



  const data = details || initialData;
  const theme = useTheme();

  const handleCopyPath = (path) => {
    navigator.clipboard.writeText(path).then(() => {
      // You could add a toast notification here if needed
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  if (!data) return null;

  return (
    <Dialog
      key={instanceKey}
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
          background: 'linear-gradient(180deg, rgba(10,18,31,0.98) 0%, rgba(15,23,42,0.98) 100%)',
          color: 'white',
        },
      }}
    >
      <DialogTitle sx={{
        m: 0,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
        borderBottom: '1px solid rgba(148,163,184,0.18)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <ComputerIcon sx={{ color: '#FF6B35' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            EC2 Instance Details
          </Typography>
          {data.instance_id ? (
            <Chip
              label={data.instance_id}
              size="small"
              sx={{ bgcolor: 'rgba(148, 163, 184, 0.16)', color: '#CBD5E1', fontWeight: 600, fontFamily: 'monospace' }}
            />
          ) : null}
          {data.instance_status
            ? (() => {
                const { color, Icon } = getLifecycleStatusConfig(data.instance_status);
                return <StatusChip label={data.instance_status} color={color} Icon={Icon} />;
              })()
            : null}
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={tintedIconButtonSx('#94A3B8')}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading && <DetailSkeleton />}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ComputerIcon fontSize="small" />
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Instance Name</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {data.instance_name || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Instance ID</Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {data.instance_id}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Instance Type</Typography>
                      <Typography variant="body2">
                        {data.instance_type}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {(() => {
                          const { color, Icon } = getLifecycleStatusConfig(data.instance_status);
                          return <StatusChip label={data.instance_status || 'N/A'} color={color} Icon={Icon} />;
                        })()}
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Instance Profile</Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {data.instance_profile || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Launch Time</Typography>
                      <Typography variant="body2">
                        {data.launch_time ? new Date(data.launch_time).toLocaleString() : 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Status Checks */}
            {data.status_checks && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon fontSize="small" />
                    Status Checks
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {(() => {
                        const { color, Icon } = getLifecycleStatusConfig(data.status_checks.system_status_check);
                        return (
                          <StatusChip
                            label={`System: ${data.status_checks.system_status_check}`}
                            color={color}
                            Icon={Icon}
                          />
                        );
                      })()}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {(() => {
                        const { color, Icon } = getLifecycleStatusConfig(data.status_checks.instance_status_check);
                        return (
                          <StatusChip
                            label={`Instance: ${data.status_checks.instance_status_check}`}
                            color={color}
                            Icon={Icon}
                          />
                        );
                      })()}
                    </Box>
                    {data.status_checks.attached_ebs_status_checks && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">EBS Status:</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          {data.status_checks.attached_ebs_status_checks.map((check, index) => {
                            const { color, Icon } = getLifecycleStatusConfig(check);
                            return <StatusChip key={index} label={check} color={color} Icon={Icon} />;
                          })}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            )}

            {/* AMI Details */}
            {data.ami_details && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InfoIcon fontSize="small" />
                    AMI Details
                  </Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">AMI ID</Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {data.ami_details.ami_id}
                      </Typography>
                    </Box>
                    {data.ami_details.ami_name && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">AMI Name</Typography>
                        <Typography variant="body2">
                          {data.ami_details.ami_name}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            )}

            {/* Network Details */}
            {data.network_details && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NetworkIcon fontSize="small" />
                    Network Configuration
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">VPC</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {data.network_details.vpc_name}
                        </Typography>
                        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                          {data.network_details.vpc_id}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Subnet</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {data.network_details.subnet_name}
                        </Typography>
                        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                          {data.network_details.subnet_id}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Availability Zone</Typography>
                        <Typography variant="body2">
                          {data.network_details.availability_zone}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Region</Typography>
                        <Typography variant="body2">
                          {data.network_details.region}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Private IP</Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {data.network_details.private_ip || 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Public IP</Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {data.network_details.public_ip || 'N/A'}
                        </Typography>
                        {data.network_details.public_ip_is_eip && (
                          <Chip label="EIP" size="small" color="info" sx={{ mt: 0.5 }} />
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Security Groups */}
            {data.network_details?.security_group_name && data.network_details.security_group_name.length > 0 && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon fontSize="small" />
                    Security Groups ({data.network_details.security_group_name.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {data.network_details.security_group_name.map((sgName, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {sgName}
                          </Typography>
                          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                            {data.network_details.security_group_id[index]}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Storage */}
            {data.storages && data.storages.length > 0 && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StorageIcon fontSize="small" />
                    Storage ({data.storages.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {data.storages.map((storage, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Stack spacing={1}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Device</Typography>
                              <Typography variant="body2" fontFamily="monospace" sx={{ fontWeight: 500 }}>
                                {storage.DeviceName}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Volume ID</Typography>
                              <Typography variant="body2" fontFamily="monospace">
                                {storage.Ebs.VolumeId}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Size</Typography>
                              <Typography variant="body2">
                                {storage.Ebs.Size} GB
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Status</Typography>
                              <Box sx={{ mt: 0.5 }}>
                                {(() => {
                                  const { color, Icon } = getLifecycleStatusConfig(storage.Ebs.Status);
                                  return <StatusChip label={storage.Ebs.Status || 'N/A'} color={color} Icon={Icon} />;
                                })()}
                              </Box>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Delete on Termination</Typography>
                              <Chip 
                                label={storage.Ebs.DeleteOnTermination ? 'Yes' : 'No'} 
                                size="small" 
                                color={storage.Ebs.DeleteOnTermination ? 'error' : 'success'}
                                variant="outlined"
                              />
                            </Box>
                          </Stack>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Tags */}
            {data.tags && data.tags.length > 0 && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LabelIcon fontSize="small" />
                    Tags ({data.tags.length})
                  </Typography>
                  <Grid container spacing={1}>
                    {data.tags.map((tag, index) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                        <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {tag.Key}
                          </Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            {tag.Value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Components */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AppsIcon fontSize="small" />
                  Components ({components.length})
                </Typography>
                
                {componentsError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {componentsError}
                  </Alert>
                )}

                {componentsLoading ? (
                  <InlineTableSkeleton rows={4} columns={5} />
                ) : components.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Component Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Platform</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Watcher Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Pipeline Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Component Path</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {components.map((component, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Typography variant="body2">
                                {component.component_name
                                  ? String(component.component_name).toLowerCase()
                                  : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const { color, Icon } = getPlatformConfig(component.platform);
                                return <StatusChip label={component.platform || 'N/A'} color={color} Icon={Icon} />;
                              })()}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const { color, Icon } = getYesNoConfig(component.watcher);
                                return <StatusChip label={component.watcher || 'N/A'} color={color} Icon={Icon} />;
                              })()}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const { color, Icon } = getYesNoConfig(component.pipeline);
                                return <StatusChip label={component.pipeline || 'N/A'} color={color} Icon={Icon} />;
                              })()}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.875rem', flex: 1 }}>
                                  {component.comp_path || 'N/A'}
                                </Typography>
                                {component.comp_path && (
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopyPath(component.comp_path)}
                                    sx={tintedIconButtonSx('#94A3B8')}
                                  >
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No components found for this instance.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EC2DetailModal;

