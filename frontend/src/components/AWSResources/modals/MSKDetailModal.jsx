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
  Security as SecurityIcon,
  Lock as LockIcon,
  CloudQueue as CloudIcon,
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
  if (['inactive', 'stopped', 'failed'].includes(normalized)) return { color: '#E24B4A', Icon: ErrorIcon };
  if (['pending', 'creating', 'updating'].includes(normalized)) return { color: '#F59E0B', Icon: HourglassEmptyIcon };
  if (!normalized || normalized === 'n/a') return { color: '#94A3B8', Icon: HelpOutlineIcon };
  return { color: '#94A3B8', Icon: HelpOutlineIcon };
}

const MSKDetailModal = ({ open, onClose, data: initialData }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !initialData || !initialData.cluster_arn) {
      return;
    }

    let cancelled = false;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        setDetails(null);

        const endpoint = '/msk/fetch-cluster-details';
        const params = { cluster_arn: initialData.cluster_arn };

        const { data: resp } = await API.get(endpoint, { params });
        
        if (!cancelled) {
          setDetails(resp.cluster_details);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.detail || 'Failed to fetch MSK details');
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

  const renderArrayChips = (array, label) => {
    if (!array || array.length === 0) return null;
    return (
      <Box>
        <Typography variant="caption" color="text.secondary">{label}:</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
          {array.map((item, index) => (
            <Chip 
              key={index}
              label={item} 
              size="small" 
              color="primary"
              variant="outlined"
            />
          ))}
        </Stack>
      </Box>
    );
  };

  if (!data || !initialData) return null;

  const { color: statusColor, Icon: StatusIcon } = getLifecycleStatusConfig(data.state);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
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
          <StorageIcon sx={{ color: '#DDA0DD' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            MSK Cluster Details
          </Typography>
          {data.cluster_name ? (
            <Chip
              label={data.cluster_name}
              size="small"
              sx={{ bgcolor: 'rgba(148, 163, 184, 0.16)', color: '#CBD5E1', fontWeight: 600 }}
            />
          ) : null}
          {data.state ? <StatusChip label={data.state} color={statusColor} Icon={StatusIcon} /> : null}
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
                      <Typography variant="caption" color="text.secondary">Cluster Name</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {data.cluster_name}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <StatusChip label={data.state || 'N/A'} color={statusColor} Icon={StatusIcon} />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Kafka Version</Typography>
                      <Chip 
                        label={data.kafka_version} 
                        size="small" 
                        variant="outlined"
                        color="primary"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Broker Nodes</Typography>
                      <Typography variant="h6" color="primary">
                        {data.number_of_broker_nodes}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Enhanced Monitoring</Typography>
                      <Chip 
                        label={data.enhanced_monitoring} 
                        size="small" 
                        variant="outlined"
                        color="info"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Cluster ARN</Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                        {data.cluster_arn}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Broker Node Group Information */}
            {data.broker_node_group_info && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon fontSize="small" />
                    Broker Node Group
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Instance Type</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {data.broker_node_group_info.InstanceType}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">AZ Distribution</Typography>
                      <Typography variant="body2">
                        {data.broker_node_group_info.BrokerAZDistribution}
                      </Typography>
                    </Box>
                    {renderArrayChips(data.broker_node_group_info.ClientSubnets, 'Client Subnets')}
                    {renderArrayChips(data.broker_node_group_info.SecurityGroups, 'Security Groups')}
                    {renderArrayChips(data.broker_node_group_info.ZoneIds, 'Availability Zones')}
                    {data.broker_node_group_info.StorageInfo?.EbsStorageInfo && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Storage</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Chip label={`${data.broker_node_group_info.StorageInfo.EbsStorageInfo.VolumeSize}GB`} size="small" variant="outlined" />
                          {data.broker_node_group_info.StorageInfo.EbsStorageInfo.ProvisionedThroughput?.Enabled && (
                            <Chip label="Provisioned Throughput" size="small" color="success" variant="outlined" />
                          )}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            )}

            {/* Client Authentication */}
            {data.client_authentication && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon fontSize="small" />
                    Client Authentication
                  </Typography>
                  <Stack spacing={1}>
                    {renderBooleanChip(data.client_authentication.Sasl?.Scram?.Enabled, 'SASL SCRAM')}
                    {renderBooleanChip(data.client_authentication.Sasl?.Iam?.Enabled, 'SASL IAM')}
                    {renderBooleanChip(data.client_authentication.Tls?.Enabled, 'TLS')}
                    {renderBooleanChip(data.client_authentication.Unauthenticated?.Enabled, 'Unauthenticated')}
                    {data.client_authentication.Tls?.CertificateAuthorityArnList && data.client_authentication.Tls.CertificateAuthorityArnList.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Certificate Authorities:</Typography>
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {data.client_authentication.Tls.CertificateAuthorityArnList.map((arn, index) => (
                            <Typography key={index} variant="body2" fontFamily="monospace" sx={{ fontSize: '0.7rem' }}>
                              {arn}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            )}

            {/* Encryption Information */}
            {data.encryption_info && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LockIcon fontSize="small" />
                    Encryption
                  </Typography>
                  <Stack spacing={2}>
                    {data.encryption_info.EncryptionAtRest?.DataVolumeKMSKeyId && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">KMS Key ID</Typography>
                        <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                          {data.encryption_info.EncryptionAtRest.DataVolumeKMSKeyId}
                        </Typography>
                      </Box>
                    )}
                    {data.encryption_info.EncryptionInTransit && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">In Transit</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Chip label={data.encryption_info.EncryptionInTransit.ClientBroker} size="small" variant="outlined" />
                          {renderBooleanChip(data.encryption_info.EncryptionInTransit.InCluster, 'In Cluster')}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            )}

            {/* Logging Information */}
            {data.logging_info && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudIcon fontSize="small" />
                    Logging Configuration
                  </Typography>
                  <Stack spacing={1}>
                    {renderBooleanChip(data.logging_info.BrokerLogs?.CloudWatchLogs?.Enabled, 'CloudWatch Logs')}
                    {data.logging_info.BrokerLogs?.CloudWatchLogs?.Enabled && data.logging_info.BrokerLogs.CloudWatchLogs.LogGroup && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Log Group</Typography>
                        <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                          {data.logging_info.BrokerLogs.CloudWatchLogs.LogGroup}
                        </Typography>
                      </Box>
                    )}
                    {renderBooleanChip(data.logging_info.BrokerLogs?.Firehose?.Enabled, 'Firehose')}
                    {renderBooleanChip(data.logging_info.BrokerLogs?.S3?.Enabled, 'S3')}
                  </Stack>
                </Paper>
              </Grid>
            )}

            {/* Connectivity Information */}
            {data.broker_node_group_info?.ConnectivityInfo && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NetworkIcon fontSize="small" />
                    Connectivity
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Public Access</Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <StatusChip
                            label={data.broker_node_group_info.ConnectivityInfo.PublicAccess.Type}
                            color={data.broker_node_group_info.ConnectivityInfo.PublicAccess.Type === 'ENABLED' ? '#F59E0B' : '#34D399'}
                            Icon={data.broker_node_group_info.ConnectivityInfo.PublicAccess.Type === 'ENABLED' ? HourglassEmptyIcon : CheckCircleIcon}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    {data.broker_node_group_info.ConnectivityInfo.VpcConnectivity?.ClientAuthentication && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">VPC Authentication</Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            {renderBooleanChip(data.broker_node_group_info.ConnectivityInfo.VpcConnectivity.ClientAuthentication.Sasl?.Scram?.Enabled, 'SASL SCRAM')}
                            {renderBooleanChip(data.broker_node_group_info.ConnectivityInfo.VpcConnectivity.ClientAuthentication.Sasl?.Iam?.Enabled, 'SASL IAM')}
                            {renderBooleanChip(data.broker_node_group_info.ConnectivityInfo.VpcConnectivity.ClientAuthentication.Tls?.Enabled, 'TLS')}
                          </Stack>
                        </Box>
                      </Grid>
                    )}
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

export default MSKDetailModal;

