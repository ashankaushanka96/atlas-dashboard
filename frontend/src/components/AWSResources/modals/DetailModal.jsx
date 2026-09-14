import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Grid,
  Divider,
  IconButton,
  Paper,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Hub as HubIcon,
  Functions as FunctionsIcon,
  Memory as MemoryIcon,
  Topic as TopicIcon,
  AccountBalance as AccountBalanceIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  NetworkCheck as NetworkIcon,
  Tag as TagIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
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

// Generic lifecycle-state -> {color, Icon} mapping shared across every AWS
// resource type shown in this modal (instance/service/cluster status, task
// state, etc), so the header StatusChip and any inline status chip read the
// same visual language regardless of resource type.
function getLifecycleStatusConfig(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (['running', 'active', 'available', 'ok', 'passed', 'enabled'].includes(normalized)) {
    return { color: '#34D399', Icon: CheckCircleIcon };
  }
  if (['stopped', 'terminated', 'inactive', 'failed', 'unavailable', 'disabled'].includes(normalized)) {
    return { color: '#E24B4A', Icon: ErrorIcon };
  }
  if (['pending', 'creating', 'updating', 'provisioning', 'starting', 'stopping', 'modifying', 'deleting'].includes(normalized)) {
    return { color: '#F59E0B', Icon: HourglassEmptyIcon };
  }
  if (!normalized || normalized === 'n/a' || normalized === 'unknown') {
    return { color: '#94A3B8', Icon: HelpOutlineIcon };
  }
  return { color: '#94A3B8', Icon: HelpOutlineIcon };
}

const TYPE_LABELS = {
  ec2: 'EC2 Instance',
  ecs: 'ECS',
  eks: 'EKS Cluster',
  lambda: 'Lambda Function',
  redis: 'Redis Cluster',
  msk: 'MSK Cluster',
  loadbalancer: 'Load Balancer',
};

function resolveStatusValue(type, data) {
  switch (type) {
    case 'ec2':
      return data?.instance_status;
    case 'ecs':
    case 'eks':
      return data?.status;
    case 'lambda':
      return data?.state || 'Active';
    case 'redis':
      return data?.status;
    case 'msk':
    case 'loadbalancer':
      return data?.state;
    default:
      return undefined;
  }
}

function resolveIdentityChips(type, data) {
  if (!data) return [];
  switch (type) {
    case 'ec2':
      return data.instance_id ? [{ label: data.instance_id, mono: true }] : [];
    case 'ecs':
      return [
        data.service_name ? { label: data.service_name, mono: false } : null,
        data.cluster_name ? { label: data.cluster_name, mono: false } : null,
      ].filter(Boolean);
    case 'eks':
      return data.cluster_name ? [{ label: data.cluster_name, mono: false }] : [];
    case 'lambda':
      return data.function_name ? [{ label: data.function_name, mono: false }] : [];
    case 'redis':
      return data.replication_group_id ? [{ label: data.replication_group_id, mono: false }] : [];
    case 'msk':
      return data.cluster_name ? [{ label: data.cluster_name, mono: false }] : [];
    case 'loadbalancer':
      return data.load_balancer_name ? [{ label: data.load_balancer_name, mono: false }] : [];
    default:
      return [];
  }
}

const DetailModal = ({ open, onClose, data: initialData, type, title }) => {
  const theme = useTheme();
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [highlightedTargetGroup, setHighlightedTargetGroup] = useState(null);

  // Prefer detailed data if available, otherwise fall back to summary data passed in
  const data = details || initialData;

  const resolveRegion = () => {
    if (!initialData && !details) return undefined;
    switch (type) {
      case 'ec2':
        return data?.network_details?.region || initialData?.region || data?.region;
      default:
        return initialData?.region || data?.region;
    }
  };

  const handleTargetGroupClick = (targetGroupArn) => {
    setHighlightedTargetGroup(targetGroupArn);
    // Scroll to target group section
    const targetGroupElement = document.getElementById(`target-group-${targetGroupArn.split('/').pop()}`);
    if (targetGroupElement) {
      targetGroupElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightedTargetGroup(null), 3000);
    }
  };

  useEffect(() => {
    if (!open || !initialData || !type) {
      return;
    }

    let cancelled = false;
    const fetchDetails = async () => {
      try {
        setLoadingDetails(true);
        setError(null);
        setDetails(null);

        switch (type) {
          case 'ec2': {
            const region = initialData.region;
            const instance_id = initialData.instance_id;
            const { data: resp } = await API.get(`/ec2-details/fetch-instance-details`, {
              params: { region, instance_id },
            });
            if (!cancelled) setDetails(resp.instance_details);
            break;
          }
          case 'ecs': {
            const region = initialData.region;
            if (initialData.service_name) {
              const { data: resp } = await API.get(`/ecs/fetch-service-details`, {
                params: {
                  region,
                  cluster_name: initialData.cluster_name,
                  service_name: initialData.service_name,
                },
              });
              if (!cancelled) setDetails(resp.service_details);
            } else {
              const { data: resp } = await API.get(`/ecs/fetch-cluster-details`, {
                params: { region, cluster_name: initialData.cluster_name },
              });
              if (!cancelled) setDetails(resp.cluster_details);
            }
            break;
          }
          case 'eks': {
            const { data: resp } = await API.get(`/eks/fetch-cluster-details`, {
              params: { region: initialData.region, cluster_name: initialData.cluster_name },
            });
            if (!cancelled) setDetails(resp.cluster_details);
            break;
          }
          case 'lambda': {
            const { data: resp } = await API.get(`/lambda/fetch-function-details`, {
              params: { region: initialData.region, function_name: initialData.function_name },
            });
            if (!cancelled) setDetails(resp.function_details);
            break;
          }
          case 'redis': {
            const { data: resp } = await API.get(`/redis/fetch-cluster-details`, {
              params: { region: initialData.region, replication_group_id: initialData.replication_group_id },
            });
            if (!cancelled) setDetails(resp.cluster_details);
            break;
          }
          case 'msk': {
            const { data: resp } = await API.get(`/msk/fetch-cluster-details`, {
              params: { region: initialData.region, cluster_name: initialData.cluster_name },
            });
            if (!cancelled) setDetails(resp.cluster_details);
            break;
          }
          case 'loadbalancer': {
            const { data: resp } = await API.get(`/loadbalancer/fetch-load-balancer-details`, {
              params: { region: initialData.region, load_balancer_arn: initialData.load_balancer_arn },
            });
            if (!cancelled) setDetails(resp.load_balancer_details);
            break;
          }
          default:
            break;
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error_message || 'Failed to load details');
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    };

    fetchDetails();
    return () => {
      cancelled = true;
      setLoadingDetails(false);
    };
  }, [open, type, initialData]);
  const getTypeIcon = () => {
    switch (type) {
      case 'ec2':
        return <CloudIcon sx={{ color: '#FF6B35' }} />;
      case 'ecs':
        return <StorageIcon sx={{ color: '#4ECDC4' }} />;
      case 'eks':
        return <HubIcon sx={{ color: '#45B7D1' }} />;
      case 'lambda':
        return <FunctionsIcon sx={{ color: '#96CEB4' }} />;
      case 'redis':
        return <MemoryIcon sx={{ color: '#FFEAA7' }} />;
      case 'msk':
        return <TopicIcon sx={{ color: '#DDA0DD' }} />;
      case 'loadbalancer':
        return <AccountBalanceIcon sx={{ color: '#98D8C8' }} />;
      default:
        return <InfoIcon />;
    }
  };

  const renderEC2Details = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" />
            Basic Information
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Instance Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.instance_name || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Instance ID</Typography>
              <Typography variant="body2" fontFamily="monospace">{data.instance_id}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Instance Type</Typography>
              <Chip label={data.instance_type || 'N/A'} size="small" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Box sx={{ mt: 0.5 }}>
                {(() => {
                  const { color, Icon } = getLifecycleStatusConfig(data.instance_status);
                  return <StatusChip label={data.instance_status || 'N/A'} color={color} Icon={Icon} />;
                })()}
              </Box>
            </Box>
            {data.instance_profile && (
              <Box>
                <Typography variant="caption" color="text.secondary">Instance Profile</Typography>
                <Typography variant="body2" fontFamily="monospace">{data.instance_profile}</Typography>
              </Box>
            )}
            {data.launch_time && (
              <Box>
                <Typography variant="caption" color="text.secondary">Launch Time</Typography>
                <Typography variant="body2">{data.launch_time}</Typography>
              </Box>
            )}
            {data.ami_details && (
              <Box>
                <Typography variant="caption" color="text.secondary">AMI</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={data.ami_details.ami_id || 'N/A'} size="small" variant="outlined" />
                  {data.ami_details.ami_name && (
                    <Chip label={data.ami_details.ami_name} size="small" variant="outlined" />
                  )}
                </Stack>
              </Box>
            )}
            {data.status_checks && (
              <Box>
                <Typography variant="caption" color="text.secondary">Status Checks</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {data.status_checks.system_status_check && (
                    <Chip label={`System: ${data.status_checks.system_status_check}`} size="small" color="success" variant="outlined" />
                  )}
                  {data.status_checks.instance_status_check && (
                    <Chip label={`Instance: ${data.status_checks.instance_status_check}`} size="small" color="success" variant="outlined" />
                  )}
                  {(data.status_checks.attached_ebs_status_checks || []).map((v, idx) => (
                    <Chip key={idx} label={`EBS: ${v}`} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <NetworkIcon fontSize="small" />
            Network Information
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Private IP</Typography>
              <Typography variant="body2" fontFamily="monospace">{data.private_ip || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Public IP</Typography>
              <Typography variant="body2" fontFamily="monospace">{data.public_ip || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Region</Typography>
              <Typography variant="body2">{data.region}</Typography>
            </Box>
            {data.network_details && (
              <>
                {data.network_details.availability_zone && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Availability Zone</Typography>
                    <Typography variant="body2">{data.network_details.availability_zone}</Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">VPC</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {data.network_details.vpc_name && <Chip label={data.network_details.vpc_name} size="small" variant="outlined" />}
                    {data.network_details.vpc_id && <Chip label={data.network_details.vpc_id} size="small" variant="outlined" />}
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Subnet</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {data.network_details.subnet_name && <Chip label={data.network_details.subnet_name} size="small" variant="outlined" />}
                    {data.network_details.subnet_id && <Chip label={data.network_details.subnet_id} size="small" variant="outlined" />}
                  </Stack>
                </Box>
                {(data.network_details.security_group_name?.length || data.network_details.security_group_id?.length) && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Security Groups</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {(data.network_details.security_group_name || []).map((n, i) => (
                        <Chip key={`sgn-${i}`} label={n} size="small" variant="outlined" />
                      ))}
                      {(data.network_details.security_group_id || []).map((id, i) => (
                        <Chip key={`sgi-${i}`} label={id} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                )}
                {data.network_details.public_ip_is_eip && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Elastic IP</Typography>
                    <Typography variant="body2" fontFamily="monospace">{data.network_details.eip_allocation_id || 'Yes'}</Typography>
                  </Box>
                )}
              </>
            )}
          </Stack>
        </Paper>
      </Grid>

      {Array.isArray(data.tags) && data.tags.length > 0 && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TagIcon fontSize="small" />
              Tags
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {data.tags.map((t, idx) => (
                <Chip key={idx} label={`${t.Key || t.key}: ${t.Value || t.value}`} size="small" variant="outlined" />
              ))}
            </Stack>
          </Paper>
        </Grid>
      )}

      {Array.isArray(data.storages) && data.storages.length > 0 && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon fontSize="small" />
              Storage Volumes
            </Typography>
            <List dense>
              {data.storages.map((s, idx) => (
                <ListItem key={idx} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <StorageIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                    primary={`${s.DeviceName || 'Device'} - ${s.Ebs?.VolumeId || ''}`}
                    secondary={`Size: ${s.Ebs?.Size ?? 'N/A'} GB • Status: ${s.Ebs?.Status || 'N/A'}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      )}
    </Grid>
  );

  const renderECSDetails = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" />
            Basic Information
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Service Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.service_name || data.cluster_name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">ARN</Typography>
              <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                {data.service_arn || data.cluster_arn}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Box sx={{ mt: 0.5 }}>
                {(() => {
                  const { color, Icon } = getLifecycleStatusConfig(data.status);
                  return <StatusChip label={data.status || 'N/A'} color={color} Icon={Icon} />;
                })()}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Region</Typography>
              <Typography variant="body2">{data.region}</Typography>
            </Box>
            {data.task_definition && (
              <Box>
                <Typography variant="caption" color="text.secondary">Task Definition</Typography>
                <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>{data.task_definition}</Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorageIcon fontSize="small" />
            Task Information
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Desired Count</Typography>
              <Chip label={data.desired_count || 0} size="small" color="primary" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Running Count</Typography>
              <Chip label={data.running_count || 0} size="small" color="success" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Pending Count</Typography>
              <Chip label={data.pending_count || 0} size="small" color="warning" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Launch Type</Typography>
              <Chip label={data.launch_type || 'N/A'} size="small" variant="outlined" />
            </Box>
            {data.registered_container_instances_count !== undefined && (
              <Box>
                <Typography variant="caption" color="text.secondary">Registered Container Instances</Typography>
                <Chip label={data.registered_container_instances_count} size="small" color="info" variant="outlined" />
              </Box>
            )}
          </Stack>
        </Paper>
      </Grid>

      {/* Service-only details */}
      {data.service_name && (
        <>
          {(data.deployment_configuration || data.network_configuration) && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon fontSize="small" />
                  Configuration
                </Typography>
                {data.deployment_configuration && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Deployment Configuration</Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.deployment_configuration, null, 2)}</Typography>
                  </Box>
                )}
                {data.network_configuration && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Network Configuration</Typography>
                    <Typography variant="body2" fontFamily="monospace" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.network_configuration, null, 2)}</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          )}
          {Array.isArray(data.load_balancers) && data.load_balancers.length > 0 && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountBalanceIcon fontSize="small" />
                  Attached Load Balancers
                </Typography>
                <List dense>
                  {data.load_balancers.map((lb, idx) => (
                    <ListItem key={idx} sx={{ py: 0.5 }}>
                      <ListItemText primaryTypographyProps={{ variant: 'body2' }} secondaryTypographyProps={{ variant: 'caption' }} primary={lb.loadBalancerName || lb.targetGroupArn || 'Load Balancer'} secondary={lb.containerName ? `Container: ${lb.containerName}:${lb.containerPort}` : (lb.loadBalancerArn || lb.targetGroupArn)} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          )}
        </>
      )}

      {/* Cluster-only details */}
      {!data.service_name && (Array.isArray(data.capacity_providers) || Array.isArray(data.default_capacity_provider_strategy) || Array.isArray(data.tags)) && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon fontSize="small" />
              Cluster Configuration
            </Typography>
            {Array.isArray(data.capacity_providers) && data.capacity_providers.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Capacity Providers</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {data.capacity_providers.map((cp, idx) => (
                    <Chip key={idx} label={cp} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}
            {Array.isArray(data.default_capacity_provider_strategy) && data.default_capacity_provider_strategy.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Default Capacity Provider Strategy</Typography>
                <Typography variant="body2" fontFamily="monospace" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.default_capacity_provider_strategy, null, 2)}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      )}

      {Array.isArray(data.tags) && data.tags.length > 0 && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TagIcon fontSize="small" />
              Tags
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {data.tags.map((t, idx) => (
                <Chip key={idx} label={`${t.Key || t.key}: ${t.Value || t.value}`} size="small" variant="outlined" />
              ))}
            </Stack>
          </Paper>
        </Grid>
      )}
    </Grid>
  );

  const renderEKSDetails = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" />
            Cluster Information
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Cluster Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.cluster_name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">ARN</Typography>
              <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                {data.cluster_arn}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Box sx={{ mt: 0.5 }}>
                {(() => {
                  const { color, Icon } = getLifecycleStatusConfig(data.status);
                  return <StatusChip label={data.status || 'N/A'} color={color} Icon={Icon} />;
                })()}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Region</Typography>
              <Typography variant="body2">{data.region}</Typography>
            </Box>
            {data.role_arn && (
              <Box>
                <Typography variant="caption" color="text.secondary">Role ARN</Typography>
                <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>{data.role_arn}</Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HubIcon fontSize="small" />
            Kubernetes Information
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Version</Typography>
              <Chip label={data.version || 'N/A'} size="small" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Platform Version</Typography>
              <Typography variant="body2">{data.platform_version || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Endpoint</Typography>
              <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                {data.endpoint || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Created At</Typography>
              <Typography variant="body2">{data.created_at || 'N/A'}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>

      {data.resources_vpc_config && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NetworkIcon fontSize="small" />
              VPC Configuration
            </Typography>
            <Typography variant="body2" fontFamily="monospace" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.resources_vpc_config, null, 2)}</Typography>
          </Paper>
        </Grid>
      )}

      {data.logging && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon fontSize="small" />
              Logging
            </Typography>
            <Typography variant="body2" fontFamily="monospace" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.logging, null, 2)}</Typography>
          </Paper>
        </Grid>
      )}

      {data.identity && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon fontSize="small" />
              Identity
            </Typography>
            <Typography variant="body2" fontFamily="monospace" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.identity, null, 2)}</Typography>
          </Paper>
        </Grid>
      )}

      {Array.isArray(data.tags) && data.tags.length > 0 && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TagIcon fontSize="small" />
              Tags
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {data.tags.map((t, idx) => (
                <Chip key={idx} label={`${t.Key || t.key}: ${t.Value || t.value}`} size="small" variant="outlined" />
              ))}
            </Stack>
          </Paper>
        </Grid>
      )}

      {Array.isArray(data.node_groups) && data.node_groups.length > 0 && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HubIcon fontSize="small" />
              Node Groups
            </Typography>
            <Typography variant="body2" fontFamily="monospace" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.node_groups, null, 2)}</Typography>
          </Paper>
        </Grid>
      )}
    </Grid>
  );

  const renderLambdaDetails = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" />
            Function Information
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Function Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.function_name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">ARN</Typography>
              <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                {data.function_arn}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Runtime</Typography>
              <Chip label={data.runtime || 'N/A'} size="small" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">State</Typography>
              <Box sx={{ mt: 0.5 }}>
                {(() => {
                  const { color, Icon } = getLifecycleStatusConfig(data.state || 'Active');
                  return <StatusChip label={data.state || 'Active'} color={color} Icon={Icon} />;
                })()}
              </Box>
            </Box>
          </Stack>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FunctionsIcon fontSize="small" />
            Configuration
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Memory (MB)</Typography>
              <Chip label={data.memory_size || 'N/A'} size="small" color="primary" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Timeout (s)</Typography>
              <Chip label={data.timeout || 'N/A'} size="small" color="warning" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Code Size</Typography>
              <Typography variant="body2">{data.code_size ? `${(data.code_size / 1024).toFixed(2)} KB` : 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Last Modified</Typography>
              <Typography variant="body2">{data.last_modified || 'N/A'}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>
      
      {data.description && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon fontSize="small" />
              Description
            </Typography>
            <Typography variant="body2">{data.description}</Typography>
          </Paper>
        </Grid>
      )}
    </Grid>
  );

  const renderRedisDetails = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" />
            Cluster Information
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Replication Group ID</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.replication_group_id}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Description</Typography>
              <Typography variant="body2">{data.description || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Box sx={{ mt: 0.5 }}>
                {(() => {
                  const { color, Icon } = getLifecycleStatusConfig(data.status);
                  return <StatusChip label={data.status || 'N/A'} color={color} Icon={Icon} />;
                })()}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Region</Typography>
              <Typography variant="body2">{data.region}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <MemoryIcon fontSize="small" />
            Configuration
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Node Type</Typography>
              <Typography variant="body2">{data.node_type || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Number of Nodes</Typography>
              <Chip label={data.num_cache_nodes || 0} size="small" color="primary" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Engine</Typography>
              <Chip label={data.engine || 'redis'} size="small" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Engine Version</Typography>
              <Typography variant="body2">{data.engine_version || 'N/A'}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderMSKDetails = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" />
            Cluster Information
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Cluster Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.cluster_name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">ARN</Typography>
              <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                {data.cluster_arn}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">State</Typography>
              <Box sx={{ mt: 0.5 }}>
                {(() => {
                  const { color, Icon } = getLifecycleStatusConfig(data.state);
                  return <StatusChip label={data.state || 'N/A'} color={color} Icon={Icon} />;
                })()}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Region</Typography>
              <Typography variant="body2">{data.region}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TopicIcon fontSize="small" />
            Kafka Configuration
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Kafka Version</Typography>
              <Chip label={data.kafka_version || 'N/A'} size="small" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Broker Count</Typography>
              <Chip label={data.number_of_broker_nodes || 0} size="small" color="primary" variant="outlined" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Enhanced Monitoring</Typography>
              <Typography variant="body2">{data.enhanced_monitoring || 'N/A'}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderLoadBalancerDetails = () => (
    <Grid container spacing={3}>
      {/* Basic Information */}
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" />
            Load Balancer Information
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.load_balancer_name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Type</Typography>
              <Chip 
                label={data.load_balancer_type || 'N/A'} 
                size="small" 
                variant="outlined"
                color={data.load_balancer_type === 'application' ? 'primary' : 'secondary'}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">State</Typography>
              <Box sx={{ mt: 0.5 }}>
                {(() => {
                  const { color, Icon } = getLifecycleStatusConfig(data.state);
                  return <StatusChip label={data.state || 'N/A'} color={color} Icon={Icon} />;
                })()}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">DNS Name</Typography>
              <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                {data.dns_name || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Scheme</Typography>
              <Chip 
                label={data.scheme || 'N/A'} 
                size="small" 
                variant="outlined"
                color={data.scheme === 'internet-facing' ? 'primary' : 'default'}
              />
            </Box>
          </Stack>
        </Paper>
      </Grid>
      
      {/* Network Configuration */}
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <NetworkIcon fontSize="small" />
            Network Configuration
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">VPC ID</Typography>
              <Typography variant="body2" fontFamily="monospace">{data.vpc_id || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">IP Address Type</Typography>
              <Typography variant="body2">{data.ip_address_type || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Region</Typography>
              <Typography variant="body2">{resolveRegion() || initialData?.region || 'N/A'}</Typography>
            </Box>
            {data.availability_zones && data.availability_zones.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Availability Zones</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {data.availability_zones.map((az, index) => (
                    <Chip key={index} label={az.ZoneName} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>
      </Grid>
      
      {/* Security Groups */}
      {data.security_groups && data.security_groups.length > 0 && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon fontSize="small" />
              Security Groups
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {data.security_groups.map((sg, index) => (
                <Chip key={index} label={sg} size="small" variant="outlined" />
              ))}
            </Stack>
          </Paper>
        </Grid>
      )}

      {/* Traffic Flow: Listeners → Rules → Target Groups */}
      {data.listeners && data.listeners.length > 0 && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NetworkIcon fontSize="small" />
              Traffic Flow: Listeners → Rules → Target Groups
            </Typography>
            <Stack spacing={3}>
              {data.listeners.map((listener, listenerIndex) => (
                <Box key={listenerIndex} sx={{ 
                  p: 3, 
                  border: '2px solid', 
                  borderColor: 'primary.main', 
                  borderRadius: 2,
                  backgroundColor: 'primary.50',
                  opacity: 0.9
                }}>
                  {/* Listener Header */}
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      Listener {listenerIndex + 1}
                    </Typography>
                    <Chip 
                      label={`${listener.protocol}:${listener.port}`} 
                      size="medium" 
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    />
                    {listener.ssl_policy && (
                      <Chip label="SSL" size="small" variant="outlined" color="secondary" />
                    )}
                    {listener.certificates && listener.certificates.length > 0 && (
                      <Chip label={`${listener.certificates.length} Cert(s)`} size="small" variant="outlined" />
                    )}
                  </Stack>

                  {/* Rules */}
                  {listener.rules && listener.rules.length > 0 && (
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                        Rules ({listener.rules.length})
                      </Typography>
                      <Stack spacing={2}>
                        {listener.rules.map((rule, ruleIndex) => (
                          <Box key={ruleIndex} sx={{ 
                            p: 2, 
                            border: '1px solid', 
                            borderColor: 'divider', 
                            borderRadius: 1,
                            backgroundColor: 'background.paper'
                          }}>
                            {/* Rule Header */}
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                              <Chip 
                                label={`Priority: ${rule.priority}`} 
                                size="small" 
                                color="secondary"
                                variant="outlined"
                              />
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Rule {ruleIndex + 1}
                              </Typography>
                            </Stack>

                            {/* Rule Conditions */}
                            {rule.conditions && rule.conditions.length > 0 && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">Conditions:</Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap">
                                  {rule.conditions.map((condition, condIndex) => (
                                    <Chip 
                                      key={condIndex}
                                      label={`${condition.Field}: ${condition.Values?.join(', ')}`} 
                                      size="small" 
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem' }}
                                    />
                                  ))}
                                </Stack>
                              </Box>
                            )}

                            {/* Rule Actions */}
                            {rule.actions && rule.actions.length > 0 && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">Actions:</Typography>
                                <Stack spacing={1} sx={{ mt: 0.5 }}>
                                  {rule.actions.map((action, actionIndex) => (
                                    <Box key={actionIndex} sx={{ 
                                      p: 1, 
                                      border: '1px solid', 
                                      borderColor: 'success.main', 
                                      borderRadius: 1,
                                      backgroundColor: 'success.50'
                                    }}>
                                      <Stack direction="row" spacing={2} alignItems="center">
                                        <Chip 
                                          label={action.Type} 
                                          size="small" 
                                          color="success"
                                          sx={{ fontWeight: 600 }}
                                        />
                                        
                                                                                 {/* Forward Action Details */}
                                         {action.Type === 'forward' && action.TargetGroupArn && (
                                           <Box>
                                             <Typography variant="caption" color="text.secondary">Target Group:</Typography>
                                             <Typography 
                                               variant="body2" 
                                               fontFamily="monospace" 
                                               sx={{ 
                                                 fontSize: '0.75rem',
                                                 cursor: 'pointer',
                                                 textDecoration: 'underline',
                                                 color: 'primary.main',
                                                 '&:hover': {
                                                   color: 'primary.dark',
                                                   backgroundColor: 'primary.50',
                                                   borderRadius: 1,
                                                   px: 0.5
                                                 }
                                               }}
                                               onClick={() => handleTargetGroupClick(action.TargetGroupArn)}
                                             >
                                               {action.TargetGroupArn.split('/').pop()}
                                             </Typography>
                                           </Box>
                                         )}

                                        {/* Redirect Action Details */}
                                        {action.Type === 'redirect' && action.RedirectConfig && (
                                          <Box>
                                            <Typography variant="caption" color="text.secondary">Redirect:</Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                              {action.RedirectConfig.Protocol}://{action.RedirectConfig.Host}:{action.RedirectConfig.Port}
                                            </Typography>
                                          </Box>
                                        )}

                                                                                 {/* Forward Config with Multiple Target Groups */}
                                         {action.ForwardConfig && action.ForwardConfig.TargetGroups && (
                                           <Box>
                                             <Typography variant="caption" color="text.secondary">Target Groups:</Typography>
                                             <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                               {action.ForwardConfig.TargetGroups.map((tg, tgIndex) => (
                                                 <Chip 
                                                   key={tgIndex}
                                                   label={`${tg.TargetGroupArn.split('/').pop()} (${tg.Weight})`} 
                                                   size="small" 
                                                   variant="outlined"
                                                   color="info"
                                                   sx={{ 
                                                     cursor: 'pointer',
                                                     '&:hover': {
                                                       backgroundColor: 'info.100',
                                                       transform: 'scale(1.05)'
                                                     }
                                                   }}
                                                   onClick={() => handleTargetGroupClick(tg.TargetGroupArn)}
                                                 />
                                               ))}
                                             </Stack>
                                           </Box>
                                         )}
                                      </Stack>
                                    </Box>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      )}

      {/* Target Groups with Associated Rules */}
      {data.target_groups && data.target_groups.length > 0 && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HubIcon fontSize="small" />
              Target Groups & Their Targets ({data.target_groups.length})
            </Typography>
            <Stack spacing={3}>
              {data.target_groups.map((tg, index) => {
                // Find which rules/listeners use this target group
                const associatedRules = [];
                if (data.listeners) {
                  data.listeners.forEach((listener, listenerIndex) => {
                    if (listener.rules) {
                      listener.rules.forEach((rule, ruleIndex) => {
                        if (rule.actions) {
                          rule.actions.forEach(action => {
                            if (action.Type === 'forward' && action.TargetGroupArn === tg.target_group_arn) {
                              associatedRules.push({
                                listener: listenerIndex + 1,
                                rule: ruleIndex + 1,
                                priority: rule.priority,
                                protocol: listener.protocol,
                                port: listener.port
                              });
                            }
                            if (action.ForwardConfig && action.ForwardConfig.TargetGroups) {
                              action.ForwardConfig.TargetGroups.forEach(forwardTg => {
                                if (forwardTg.TargetGroupArn === tg.target_group_arn) {
                                  associatedRules.push({
                                    listener: listenerIndex + 1,
                                    rule: ruleIndex + 1,
                                    priority: rule.priority,
                                    protocol: listener.protocol,
                                    port: listener.port,
                                    weight: forwardTg.Weight
                                  });
                                }
                              });
                            }
                          });
                        }
                      });
                    }
                  });
                }

                                 return (
                   <Box 
                     key={index} 
                     id={`target-group-${tg.target_group_arn.split('/').pop()}`}
                     sx={{ 
                       p: 3, 
                       border: '2px solid', 
                       borderColor: highlightedTargetGroup === tg.target_group_arn ? 'warning.main' : 'info.main', 
                       borderRadius: 2,
                       backgroundColor: highlightedTargetGroup === tg.target_group_arn ? 'warning.50' : 'info.50',
                       opacity: 0.9,
                       transition: 'all 0.3s ease',
                       transform: highlightedTargetGroup === tg.target_group_arn ? 'scale(1.02)' : 'scale(1)',
                       boxShadow: highlightedTargetGroup === tg.target_group_arn ? '0 4px 20px rgba(255, 152, 0, 0.3)' : 'none'
                     }}
                   >
                    {/* Target Group Header */}
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
                        {tg.target_group_name}
                      </Typography>
                      <Chip 
                        label={`${tg.protocol}:${tg.port}`} 
                        size="medium" 
                        color="info"
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip 
                        label={tg.target_type} 
                        size="small" 
                        color="secondary"
                      />
                    </Stack>

                    {/* Associated Rules */}
                    {associatedRules.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                          Traffic From:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {associatedRules.map((rule, ruleIndex) => (
                            <Chip 
                              key={ruleIndex}
                              label={`L${rule.listener} R${rule.rule} (${rule.protocol}:${rule.port})`} 
                              size="small" 
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    
                    {/* Health Check */}
                    {tg.health_check && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                          Health Check Configuration
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip 
                            label={`${tg.health_check.protocol}:${tg.health_check.port}`} 
                            size="small" 
                            variant="outlined"
                          />
                          <Chip 
                            label={`Interval: ${tg.health_check.interval_seconds}s`} 
                            size="small" 
                            variant="outlined"
                          />
                          <Chip 
                            label={`Threshold: ${tg.health_check.healthy_threshold}/${tg.health_check.unhealthy_threshold}`} 
                            size="small" 
                            variant="outlined"
                          />
                          {tg.health_check.path && (
                            <Chip 
                              label={`Path: ${tg.health_check.path}`} 
                              size="small" 
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </Box>
                    )}

                    {/* Targets */}
                    {tg.targets && tg.targets.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                          Targets ({tg.targets.length})
                        </Typography>
                        <Grid container spacing={1}>
                          {tg.targets.map((target, targetIndex) => (
                            <Grid item xs={12} sm={6} key={targetIndex}>
                              <Box sx={{ 
                                p: 1.5, 
                                border: '1px solid', 
                                borderColor: target.health_state === 'healthy' ? 'success.main' : 'error.main', 
                                borderRadius: 1,
                                backgroundColor: target.health_state === 'healthy' ? 'success.50' : 'error.50'
                              }}>
                                <Stack spacing={1}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" fontFamily="monospace" sx={{ fontWeight: 500 }}>
                                      {target.id}
                                    </Typography>
                                    <Chip 
                                      label={target.health_state} 
                                      size="small" 
                                      color={target.health_state === 'healthy' ? 'success' : 'error'}
                                      sx={{ fontWeight: 600 }}
                                    />
                                  </Stack>
                                  <Stack direction="row" spacing={2}>
                                    {target.private_ip && (
                                      <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                                        Private: {target.private_ip}
                                      </Typography>
                                    )}
                                    {target.public_ip && (
                                      <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                                        Public: {target.public_ip}
                                      </Typography>
                                    )}
                                  </Stack>
                                </Stack>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Grid>
      )}

      {/* Tags */}
      {data.tags && data.tags.length > 0 && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TagIcon fontSize="small" />
              Tags
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {data.tags.map((tag, index) => (
                <Chip 
                  key={index} 
                  label={`${tag.Key}: ${tag.Value}`} 
                  size="small" 
                  variant="outlined"
                />
              ))}
            </Stack>
          </Paper>
        </Grid>
      )}

      {/* Attributes */}
      {data.attributes && Object.keys(data.attributes).length > 0 && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon fontSize="small" />
              Attributes ({Object.keys(data.attributes).length})
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(data.attributes).map(([key, value]) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{key}</Typography>
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
    </Grid>
  );

  const renderDetails = () => {
    switch (type) {
      case 'ec2':
        return renderEC2Details();
      case 'ecs':
        return renderECSDetails();
      case 'eks':
        return renderEKSDetails();
      case 'lambda':
        return renderLambdaDetails();
      case 'redis':
        return renderRedisDetails();
      case 'msk':
        return renderMSKDetails();
      case 'loadbalancer':
        return renderLoadBalancerDetails();
      default:
        return (
          <Typography variant="body2" color="text.secondary">
            No detailed information available for this item.
          </Typography>
        );
    }
  };

  const statusValue = resolveStatusValue(type, data);
  const identityChips = resolveIdentityChips(type, data);
  const { color: statusColor, Icon: StatusIcon } = getLifecycleStatusConfig(statusValue);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
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
          {getTypeIcon()}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title || TYPE_LABELS[type] || 'Resource Details'}
          </Typography>
          {identityChips.map((chip) => (
            <Chip
              key={chip.label}
              label={chip.label}
              size="small"
              sx={{
                bgcolor: 'rgba(148, 163, 184, 0.16)',
                color: '#CBD5E1',
                fontWeight: 600,
                ...(chip.mono && { fontFamily: 'monospace' }),
              }}
            />
          ))}
          {statusValue ? <StatusChip label={statusValue} color={statusColor} Icon={StatusIcon} /> : null}
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={tintedIconButtonSx('#94A3B8')}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: 2 }}>
        {loadingDetails && <DetailSkeleton />}
        {!loadingDetails && error && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="error">{error}</Typography>
          </Box>
        )}
        {!loadingDetails && data && renderDetails()}
      </DialogContent>

      <Divider sx={{ borderColor: 'rgba(148,163,184,0.18)' }} />

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetailModal;
