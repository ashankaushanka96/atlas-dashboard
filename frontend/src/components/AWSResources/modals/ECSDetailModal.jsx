import { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  Storage as StorageIcon,
  Info as InfoIcon,
  Label as LabelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  NetworkCheck as NetworkIcon,
  HourglassEmpty as HourglassEmptyIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { API } from '../../../services/auth';
import DetailSkeleton from './DetailSkeleton';
import StatusChip from '../../HostDetails/StatusChip';
import hexToRgb from '../../shared/hexToRgb';

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
});

function getLifecycleStatusConfig(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (['active', 'running'].includes(normalized)) return { color: '#34D399', Icon: CheckCircleIcon };
  if (['inactive', 'stopped'].includes(normalized)) return { color: '#E24B4A', Icon: ErrorIcon };
  if (['pending', 'starting'].includes(normalized)) return { color: '#F59E0B', Icon: HourglassEmptyIcon };
  if (!normalized || normalized === 'n/a') return { color: '#94A3B8', Icon: HelpOutlineIcon };
  return { color: '#94A3B8', Icon: HelpOutlineIcon };
}

const ECSDetailModal = ({ open, onClose, data: initialData }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !initialData || !initialData.region) {
      return;
    }

    let cancelled = false;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        setDetails(null);

        const region = initialData.region;
        let endpoint = '';
        let params = { region };

        if (initialData.service_name && initialData.cluster_name) {
          // Fetch service details
          endpoint = '/ecs/fetch-service-details';
          params = {
            ...params,
            cluster_name: initialData.cluster_name,
            service_name: initialData.service_name,
          };
        } else if (initialData.cluster_name) {
          // Fetch cluster details
          endpoint = '/ecs/fetch-cluster-details';
          params = { ...params, cluster_name: initialData.cluster_name };
        } else {
          throw new Error('Missing required parameters: cluster_name is required');
        }

        const { data: resp } = await API.get(endpoint, { params });
        
        if (!cancelled) {
          const detailsKey = initialData.service_name ? 'service_details' : 'cluster_details';
          setDetails(resp[detailsKey]);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.detail || 'Failed to fetch ECS details');
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

  const data = details || initialData;
  const isService = !!initialData?.service_name;
  const theme = useTheme();

  if (!data || !initialData) return null;

  const { color: statusColor, Icon: StatusIcon } = getLifecycleStatusConfig(data.status);

  return (
    <Dialog
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
          <StorageIcon sx={{ color: '#4ECDC4' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {isService ? 'ECS Service Details' : 'ECS Cluster Details'}
          </Typography>
          {(isService ? data.service_name : data.cluster_name) ? (
            <Chip
              label={isService ? data.service_name : data.cluster_name}
              size="small"
              sx={{ bgcolor: 'rgba(148, 163, 184, 0.16)', color: '#CBD5E1', fontWeight: 600 }}
            />
          ) : null}
          {data.status ? <StatusChip label={data.status} color={statusColor} Icon={StatusIcon} /> : null}
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
                  <InfoIcon fontSize="small" />
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {isService ? 'Service Name' : 'Cluster Name'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {isService ? data.service_name : data.cluster_name}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">ARN</Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                        {isService ? data.service_arn : data.cluster_arn}
                      </Typography>
                    </Box>
                  </Grid>
                  {isService && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Cluster Name</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {data.cluster_name}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <StatusChip label={data.status || 'N/A'} color={statusColor} Icon={StatusIcon} />
                      </Box>
                    </Box>
                  </Grid>
                  {isService && (
                    <>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Launch Type</Typography>
                          <Chip 
                            label={data.launch_type} 
                            size="small" 
                            variant="outlined"
                            color="primary"
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Task Definition</Typography>
                          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                            {data.task_definition}
                          </Typography>
                        </Box>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Paper>
            </Grid>

            {/* Counts and Metrics */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon fontSize="small" />
                  {isService ? 'Service Metrics' : 'Cluster Metrics'}
                </Typography>
                <Grid container spacing={2}>
                  {isService ? (
                    <>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Desired Count</Typography>
                          <Typography variant="h6" color="primary">
                            {data.desired_count}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Running Count</Typography>
                          <Typography variant="h6" color="success.main">
                            {data.running_count}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Pending Count</Typography>
                          <Typography variant="h6" color="warning.main">
                            {data.pending_count}
                          </Typography>
                        </Box>
                      </Grid>
                    </>
                  ) : (
                    <>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Active Services</Typography>
                          <Typography variant="h6" color="primary">
                            {data.active_services_count}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Running Tasks</Typography>
                          <Typography variant="h6" color="success.main">
                            {data.running_tasks_count}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Pending Tasks</Typography>
                          <Typography variant="h6" color="warning.main">
                            {data.pending_tasks_count}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Container Instances</Typography>
                          <Typography variant="h6" color="info.main">
                            {data.registered_container_instances_count}
                          </Typography>
                        </Box>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Paper>
            </Grid>

            {/* Capacity Providers (Cluster only) */}
            {!isService && data.capacity_providers && data.capacity_providers.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon fontSize="small" />
                    Capacity Providers
                  </Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Providers:</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        {data.capacity_providers.map((provider, index) => (
                          <Chip 
                            key={index}
                            label={provider} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Box>
                    {data.default_capacity_provider_strategy && data.default_capacity_provider_strategy.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Default Strategy:</Typography>
                        <Stack spacing={1} sx={{ mt: 0.5 }}>
                          {data.default_capacity_provider_strategy.map((strategy, index) => (
                            <Box key={index} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {strategy.capacityProvider}
                                </Typography>
                                <Chip label={`Weight: ${strategy.weight}`} size="small" variant="outlined" />
                                <Chip label={`Base: ${strategy.base}`} size="small" variant="outlined" />
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            )}

            {/* Deployment Configuration (Service only) */}
            {isService && data.deployment_configuration && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon fontSize="small" />
                    Deployment Configuration
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Maximum Percent</Typography>
                        <Typography variant="body2">
                          {data.deployment_configuration.maximumPercent}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Minimum Healthy Percent</Typography>
                        <Typography variant="body2">
                          {data.deployment_configuration.minimumHealthyPercent}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Bake Time (Minutes)</Typography>
                        <Typography variant="body2">
                          {data.deployment_configuration.bakeTimeInMinutes}
                        </Typography>
                      </Box>
                    </Grid>
                    {data.deployment_configuration.deploymentCircuitBreaker && (
                      <Grid item xs={12}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Circuit Breaker</Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            <Chip 
                              label={`Enable: ${data.deployment_configuration.deploymentCircuitBreaker.enable ? 'Yes' : 'No'}`} 
                              size="small" 
                              color={data.deployment_configuration.deploymentCircuitBreaker.enable ? 'success' : 'default'}
                              variant="outlined"
                            />
                            <Chip 
                              label={`Rollback: ${data.deployment_configuration.deploymentCircuitBreaker.rollback ? 'Yes' : 'No'}`} 
                              size="small" 
                              color={data.deployment_configuration.deploymentCircuitBreaker.rollback ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </Stack>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Network Configuration (Service only) */}
            {isService && data.network_configuration && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NetworkIcon fontSize="small" />
                    Network Configuration
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(data.network_configuration).map(([key, value]) => (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            {value || 'N/A'}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Load Balancers (Service only) */}
            {isService && data.load_balancers && data.load_balancers.length > 0 && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NetworkIcon fontSize="small" />
                    Load Balancers ({data.load_balancers.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {data.load_balancers.map((lb, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          {Object.entries(lb).map(([key, value]) => (
                            <Box key={key} sx={{ mb: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Typography>
                              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                {value || 'N/A'}
                              </Typography>
                            </Box>
                          ))}
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
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ECSDetailModal;
