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
  Info as InfoIcon,
  Label as LabelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  NetworkCheck as NetworkIcon,
  Security as SecurityIcon,
  Memory as MemoryIcon,
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
  if (['available', 'active', 'running'].includes(normalized)) return { color: '#34D399', Icon: CheckCircleIcon };
  if (['unavailable', 'inactive', 'stopped', 'failed'].includes(normalized)) return { color: '#E24B4A', Icon: ErrorIcon };
  if (['creating', 'modifying', 'deleting', 'pending'].includes(normalized)) return { color: '#F59E0B', Icon: HourglassEmptyIcon };
  if (!normalized || normalized === 'n/a') return { color: '#94A3B8', Icon: HelpOutlineIcon };
  return { color: '#94A3B8', Icon: HelpOutlineIcon };
}

function getRoleConfig(role) {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'primary') return { color: '#60A5FA', Icon: MemoryIcon };
  if (normalized === 'replica') return { color: '#A78BFA', Icon: MemoryIcon };
  return { color: '#94A3B8', Icon: MemoryIcon };
}

const RedisDetailModal = ({ open, onClose, data: initialData }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !initialData || !initialData.region || !initialData.replication_group_id) {
      return;
    }

    let cancelled = false;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        setDetails(null);

        const endpoint = '/redis/fetch-cluster-details';
        const params = { 
          region: initialData.region,
          replication_group_id: initialData.replication_group_id 
        };

        const { data: resp } = await API.get(endpoint, { params });
        
        if (!cancelled) {
          setDetails(resp.cluster_details);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.detail || 'Failed to fetch Redis details');
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
  const theme = useTheme();

  const renderBooleanChip = (value, label) => (
    <StatusChip
      label={`${label}: ${value ? 'Yes' : 'No'}`}
      color={value ? '#34D399' : '#94A3B8'}
      Icon={value ? CheckCircleIcon : HelpOutlineIcon}
    />
  );

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
          <MemoryIcon sx={{ color: '#FFEAA7' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Redis Cluster Details
          </Typography>
          {data.replication_group_id ? (
            <Chip
              label={data.replication_group_id}
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
                      <Typography variant="caption" color="text.secondary">Replication Group ID</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {data.replication_group_id}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Description</Typography>
                      <Typography variant="body2">
                        {data.description || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <StatusChip label={data.status || 'N/A'} color={statusColor} Icon={StatusIcon} />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Engine</Typography>
                      <Chip 
                        label={data.engine} 
                        size="small" 
                        variant="outlined"
                        color="primary"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Engine Version</Typography>
                      <Typography variant="body2">
                        {data.engine_version || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Port</Typography>
                      <Typography variant="body2">
                        {data.port || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Node Configuration */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon fontSize="small" />
                  Node Configuration
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Node Type</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {data.node_type}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Number of Cache Nodes</Typography>
                    <Typography variant="body2">
                      {data.num_cache_nodes || 'N/A'}
                    </Typography>
                  </Box>
                  {data.cache_parameter_group && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Parameter Group</Typography>
                      <Typography variant="body2">
                        {data.cache_parameter_group}
                      </Typography>
                    </Box>
                  )}
                  {data.cache_subnet_group && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Subnet Group</Typography>
                      <Typography variant="body2">
                        {data.cache_subnet_group}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>

            {/* Security Configuration */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon fontSize="small" />
                  Security Configuration
                </Typography>
                <Stack spacing={1}>
                  {renderBooleanChip(data.at_rest_encryption_enabled, 'Encryption at Rest')}
                  {renderBooleanChip(data.transit_encryption_enabled, 'Encryption in Transit')}
                  {data.security_groups && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Security Groups</Typography>
                      <Typography variant="body2">
                        {data.security_groups}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>

            {/* Cache Nodes */}
            {data.cache_nodes && data.cache_nodes.length > 0 && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NetworkIcon fontSize="small" />
                    Cache Nodes ({data.cache_nodes.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {data.cache_nodes.map((node, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Stack spacing={1}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Cache Cluster ID</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {node.CacheClusterId}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Cache Node ID</Typography>
                              <Typography variant="body2">
                                {node.CacheNodeId}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Role</Typography>
                              <Box sx={{ mt: 0.5 }}>
                                {(() => {
                                  const { color, Icon } = getRoleConfig(node.CurrentRole);
                                  return <StatusChip label={node.CurrentRole || 'N/A'} color={color} Icon={Icon} />;
                                })()}
                              </Box>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Availability Zone</Typography>
                              <Typography variant="body2">
                                {node.PreferredAvailabilityZone}
                              </Typography>
                            </Box>
                            {node.ReadEndpoint && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">Read Endpoint</Typography>
                                <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                                  {node.ReadEndpoint.Address}:{node.ReadEndpoint.Port}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Tags */}
            {data.tags && Object.keys(data.tags).length > 0 && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LabelIcon fontSize="small" />
                    Tags ({Object.keys(data.tags).length})
                  </Typography>
                  <Grid container spacing={1}>
                    {Object.entries(data.tags).map(([key, value]) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
                        <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {key}
                          </Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            {value}
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

export default RedisDetailModal;
