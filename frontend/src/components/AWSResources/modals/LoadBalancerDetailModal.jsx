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
  Hub as HubIcon,
  NetworkCheck as NetworkIcon,
  Label as LabelIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
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
  if (normalized === 'active') return { color: '#34D399', Icon: CheckCircleIcon };
  if (!normalized || normalized === 'n/a') return { color: '#94A3B8', Icon: InfoIcon };
  return { color: '#E24B4A', Icon: ErrorIcon };
}

const LoadBalancerDetailModal = ({ open, onClose, data: initialData }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlightedTargetGroup, setHighlightedTargetGroup] = useState(null);

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

        const { data: resp } = await API.get(`/loadbalancer/fetch-load-balancer-details`, {
          params: { region: initialData.region, load_balancer_arn: initialData.load_balancer_arn },
        });
        
        if (!cancelled) {
          setDetails(resp.load_balancer_details);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.detail || 'Failed to fetch Load Balancer details');
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

  const resolveRegion = () => {
    return data?.network_details?.region || initialData?.region || data?.region;
  };

  const theme = useTheme();

  if (!data) return null;

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
          <HubIcon sx={{ color: '#98D8C8' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Load Balancer Details
          </Typography>
          {data.load_balancer_name ? (
            <Chip
              label={data.load_balancer_name}
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
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Load Balancer Name</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {data.load_balancer_name}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">DNS Name</Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {data.dns_name}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Scheme</Typography>
                      <Chip 
                        label={data.scheme} 
                        size="small" 
                        color={data.scheme === 'internet-facing' ? 'primary' : 'secondary'}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Type</Typography>
                      <Chip 
                        label={data.load_balancer_type} 
                        size="small" 
                        color="info"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">State</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <StatusChip label={data.state || 'N/A'} color={statusColor} Icon={StatusIcon} />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Region</Typography>
                      <Typography variant="body2">{resolveRegion() || initialData?.region || 'N/A'}</Typography>
                    </Box>
                  </Grid>
                  {data.availability_zones && data.availability_zones.length > 0 && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Availability Zones</Typography>
                        <Typography variant="body2">
                          {data.availability_zones.length} zone(s)
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">VPC</Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {data.vpc_id}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

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
                                          <StatusChip
                                            label={target.health_state}
                                            color={target.health_state === 'healthy' ? '#34D399' : '#E24B4A'}
                                            Icon={target.health_state === 'healthy' ? CheckCircleIcon : ErrorIcon}
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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoadBalancerDetailModal;
