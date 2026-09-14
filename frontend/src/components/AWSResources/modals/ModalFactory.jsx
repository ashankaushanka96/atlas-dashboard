import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Grid,
  Paper,
  Alert
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  Info as InfoIcon,
  Label as LabelIcon
} from '@mui/icons-material';
import EC2DetailModal from './EC2DetailModal';
import LoadBalancerDetailModal from './LoadBalancerDetailModal';
import ECSDetailModal from './ECSDetailModal';
import MSKDetailModal from './MSKDetailModal';
import RedisDetailModal from './RedisDetailModal';
import { API } from '../../../services/auth';
import DetailSkeleton from './DetailSkeleton';
import hexToRgb from '../../shared/hexToRgb';

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
});

// Generic Detail Modal for infrastructure types that don't have specific modals yet
const GenericDetailModal = ({ open, onClose, data: initialData, type, title }) => {
  const theme = useTheme();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !initialData) {
      return;
    }

    let cancelled = false;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        setDetails(null);

        let endpoint = '';
        let params = { region: initialData.region };

        // Determine endpoint based on type
        switch (type) {
          case 'ecs':
            if (initialData.service_name) {
              endpoint = '/ecs/fetch-service-details';
              params = {
                ...params,
                cluster_name: initialData.cluster_name,
                service_name: initialData.service_name,
              };
            } else {
              endpoint = '/ecs/fetch-cluster-details';
              params = { ...params, cluster_name: initialData.cluster_name };
            }
            break;
          case 'eks':
            endpoint = '/eks/fetch-cluster-details';
            params = { ...params, cluster_name: initialData.cluster_name };
            break;
          case 'lambda':
            endpoint = '/lambda/fetch-function-details';
            params = { ...params, function_name: initialData.function_name };
            break;
          case 'redis':
            endpoint = '/redis/fetch-cluster-details';
            params = { ...params, replication_group_id: initialData.replication_group_id };
            break;
                     case 'msk':
             endpoint = '/msk/fetch-cluster-details';
             params = { cluster_arn: initialData.cluster_arn };
             break;
          default:
            throw new Error(`Unknown type: ${type}`);
        }

        const { data: resp } = await API.get(endpoint, { params });
        
        if (!cancelled) {
          // Extract the details from the response based on type
          const detailsKey = `${type}_details` || `${type.replace(/s$/, '')}_details`;
          setDetails(resp[detailsKey] || resp);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.detail || `Failed to fetch ${type} details`);
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
  }, [open, initialData, type]);

  const data = details || initialData;

  const renderValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderObject = (obj, title) => {
    if (!obj || typeof obj !== 'object') return null;

    return (
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" />
            {title}
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(obj).map(([key, value]) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {renderValue(value)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>
    );
  };

  if (!data) return null;

  const identityLabel = data.cluster_name || data.function_name || data.name;
  const statusValue = data.status || data.state;

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
          <InfoIcon sx={{ color: '#60A5FA' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title || `${type.toUpperCase()} Details`}
          </Typography>
          {identityLabel ? (
            <Chip
              label={identityLabel}
              size="small"
              sx={{ bgcolor: 'rgba(148, 163, 184, 0.16)', color: '#CBD5E1', fontWeight: 600 }}
            />
          ) : null}
          {statusValue ? (
            <Chip
              label={statusValue}
              size="small"
              sx={{ bgcolor: 'rgba(148, 163, 184, 0.16)', color: '#CBD5E1', fontWeight: 600 }}
            />
          ) : null}
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={tintedIconButtonSx('#94A3B8')}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading && <DetailSkeleton compact />}

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
                  {Object.entries(data).map(([key, value]) => {
                    // Skip complex objects and arrays for basic info
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                      return null;
                    }
                    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                      return null;
                    }
                    
                    return (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            {renderValue(value)}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Paper>
            </Grid>

            {/* Complex Objects */}
            {Object.entries(data).map(([key, value]) => {
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                return renderObject(value, key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
              }
              return null;
            })}

            {/* Arrays */}
            {Object.entries(data).map(([key, value]) => {
              if (Array.isArray(value) && value.length > 0) {
                return (
                  <Grid item xs={12} key={key}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.04), borderColor: theme.palette.divider }}>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LabelIcon fontSize="small" />
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ({value.length})
                      </Typography>
                      <Grid container spacing={2}>
                        {value.map((item, index) => (
                          <Grid item xs={12} sm={6} md={4} key={index}>
                            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                              {typeof item === 'object' ? (
                                Object.entries(item).map(([itemKey, itemValue]) => (
                                  <Box key={itemKey} sx={{ mb: 1 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                      {itemKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </Typography>
                                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                      {renderValue(itemValue)}
                                    </Typography>
                                  </Box>
                                ))
                              ) : (
                                <Typography variant="body2">{renderValue(item)}</Typography>
                              )}
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>
                );
              }
              return null;
            })}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

const ModalFactory = ({ open, onClose, data, type, title }) => {
  switch (type) {
    case 'ec2':
      return (
        <EC2DetailModal 
          open={open} 
          onClose={onClose} 
          data={data} 
        />
      );
    case 'loadbalancer':
      return (
        <LoadBalancerDetailModal 
          open={open} 
          onClose={onClose} 
          data={data} 
        />
      );
    case 'ecs':
      return (
        <ECSDetailModal 
          open={open} 
          onClose={onClose} 
          data={data} 
        />
      );
    case 'msk':
      return (
        <MSKDetailModal 
          open={open} 
          onClose={onClose} 
          data={data} 
        />
      );
    case 'redis':
      return (
        <RedisDetailModal 
          open={open} 
          onClose={onClose} 
          data={data} 
        />
      );
    case 'eks':
    case 'lambda':
      return (
        <GenericDetailModal 
          open={open} 
          onClose={onClose} 
          data={data} 
          type={type}
          title={title}
        />
      );
    default:
      return (
        <GenericDetailModal 
          open={open} 
          onClose={onClose} 
          data={data} 
          type={type}
          title={title}
        />
      );
  }
};

export default ModalFactory;
