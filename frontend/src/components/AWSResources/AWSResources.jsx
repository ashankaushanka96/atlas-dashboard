import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip,
  Stack,
  CircularProgress
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloudRoundedIcon from "@mui/icons-material/CloudRounded";
import StorageIcon from "@mui/icons-material/Storage";
import HubIcon from "@mui/icons-material/Hub";
import FunctionsIcon from "@mui/icons-material/Functions";
import MemoryIcon from "@mui/icons-material/Memory";
import TopicIcon from "@mui/icons-material/Topic";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import WidgetsIcon from "@mui/icons-material/Widgets";

import EC2Tab from "./tabs/EC2Tab";
import ECSTab from "./tabs/ECSTab";
import EKSTab from "./tabs/EKSTab";
import LambdaTab from "./tabs/LambdaTab";
import RedisTab from "./tabs/RedisTab";
import MSKTab from "./tabs/MSKTab";
import LoadBalancerTab from "./tabs/LoadBalancerTab";
import { API } from "../../services/auth";
import ErrorModal from "../../modals/ErrorModal";
import StatusChip from "../HostDetails/StatusChip";
import SectionFilterBar from "../shared/SectionFilterBar";
import hexToRgb from "../shared/hexToRgb";

const HEADER_ACCENT = "#FF6B35";

const tintedIconButtonSx = (color) => ({
  color,
  bgcolor: `rgba(${hexToRgb(color)}, 0.12)`,
  "&:hover": { bgcolor: `rgba(${hexToRgb(color)}, 0.24)` },
  "&.Mui-disabled": { color: "text.disabled", bgcolor: "transparent" },
});

const INFRASTRUCTURE_TABS = [
  {
    id: 'ec2',
    label: 'EC2 Instances',
    icon: <CloudRoundedIcon />,
    iconComponent: CloudRoundedIcon,
    color: '#FF6B35'
  },
  {
    id: 'ecs',
    label: 'ECS Services',
    icon: <StorageIcon />,
    iconComponent: StorageIcon,
    color: '#4ECDC4'
  },
  {
    id: 'eks',
    label: 'EKS Clusters',
    icon: <HubIcon />,
    iconComponent: HubIcon,
    color: '#45B7D1'
  },
  {
    id: 'lambda',
    label: 'Lambda Functions',
    icon: <FunctionsIcon />,
    iconComponent: FunctionsIcon,
    color: '#96CEB4'
  },
  {
    id: 'redis',
    label: 'Redis Clusters',
    icon: <MemoryIcon />,
    iconComponent: MemoryIcon,
    color: '#FFEAA7'
  },
  {
    id: 'msk',
    label: 'MSK Clusters',
    icon: <TopicIcon />,
    iconComponent: TopicIcon,
    color: '#DDA0DD'
  },
  {
    id: 'loadbalancer',
    label: 'Load Balancers',
    icon: <AccountBalanceIcon />,
    iconComponent: AccountBalanceIcon,
    color: '#98D8C8'
  }
];

const AWSResources = () => {
  const wrapperRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial state from URL params
  const initialTab = searchParams.get('tab') || '0';
  const initialSearch = searchParams.get('search') || '';
  
  const [activeTab, setActiveTab] = useState(parseInt(initialTab));
  const [globalSearch, setGlobalSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openErrorModal, setOpenErrorModal] = useState(false);

  // Global infrastructure data state
  const [infrastructureData, setInfrastructureData] = useState({
    ec2: { instances: [], loading: false, error: null },
    ecs: { clusters: [], services: [], loading: false, error: null },
    eks: { clusters: [], loading: false, error: null },
    lambda: { functions: [], loading: false, error: null },
    redis: { clusters: [], loading: false, error: null },
    msk: { clusters: [], loading: false, error: null },
    loadbalancer: { loadBalancers: [], loading: false, error: null }
  });

  // Update URL when tab or search changes
  const updateURL = (tab, search) => {
    const newSearchParams = new URLSearchParams();
    if (tab !== undefined) newSearchParams.set('tab', tab.toString());
    if (search !== undefined) newSearchParams.set('search', search);
    setSearchParams(newSearchParams);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    updateURL(newValue, globalSearch);
  };

  // Handle global search change
  const handleGlobalSearchChange = (value) => {
    setGlobalSearch(value);
    updateURL(activeTab, value);
  };

  // Clear global search
  const clearGlobalSearch = () => {
    setGlobalSearch("");
    updateURL(activeTab, "");
  };

  const showErrorModal = (message) => {
    setError(message);
    setOpenErrorModal(true);
  };

  // Individual tab refresh functions
  const refreshEC2Data = async () => {
    setInfrastructureData(prev => ({ ...prev, ec2: { ...prev.ec2, loading: true } }));
    try {
      const ec2Resp = await API.get(`/ec2-details/fetch-instance-summary`, {
        params: { fresh: "true" },
      });
      setInfrastructureData(prev => ({ 
        ...prev, 
        ec2: { 
          instances: ec2Resp.data.instances || [], 
          loading: false, 
          error: null 
        } 
      }));
    } catch (e) {
      setInfrastructureData(prev => ({ 
        ...prev, 
        ec2: { 
          instances: [], 
          loading: false, 
          error: e.response?.data?.error_message || "Failed to fetch EC2 data" 
        } 
      }));
    }
  };

  const refreshECSData = async () => {
    setInfrastructureData(prev => ({ ...prev, ecs: { ...prev.ecs, loading: true } }));
    try {
      const [ecsClustersResp, ecsServicesResp] = await Promise.all([
        API.get(`/ecs/fetch-clusters-summary`, { params: { fresh: "true" } }),
        API.get(`/ecs/fetch-services-summary`, { params: { fresh: "true" } })
      ]);
      setInfrastructureData(prev => ({ 
        ...prev, 
        ecs: { 
          clusters: ecsClustersResp.data.clusters || [], 
          services: ecsServicesResp.data.services || [], 
          loading: false, 
          error: null 
        } 
      }));
    } catch (e) {
      setInfrastructureData(prev => ({ 
        ...prev, 
        ecs: { 
          clusters: [], 
          services: [], 
          loading: false, 
          error: e.response?.data?.error_message || "Failed to fetch ECS data" 
        } 
      }));
    }
  };

  const refreshEKSData = async () => {
    setInfrastructureData(prev => ({ ...prev, eks: { ...prev.eks, loading: true } }));
    try {
      const eksResp = await API.get(`/eks/fetch-clusters-summary`, {
        params: { fresh: "true" },
      });
      setInfrastructureData(prev => ({ 
        ...prev, 
        eks: { 
          clusters: eksResp.data.clusters || [], 
          loading: false, 
          error: null 
        } 
      }));
    } catch (e) {
      setInfrastructureData(prev => ({ 
        ...prev, 
        eks: { 
          clusters: [], 
          loading: false, 
          error: e.response?.data?.error_message || "Failed to fetch EKS data" 
        } 
      }));
    }
  };

  const refreshLambdaData = async () => {
    setInfrastructureData(prev => ({ ...prev, lambda: { ...prev.lambda, loading: true } }));
    try {
      const lambdaResp = await API.get(`/lambda/fetch-functions-summary`, {
        params: { fresh: "true" },
      });
      setInfrastructureData(prev => ({ 
        ...prev, 
        lambda: { 
          functions: lambdaResp.data.functions || [], 
          loading: false, 
          error: null 
        } 
      }));
    } catch (e) {
      setInfrastructureData(prev => ({ 
        ...prev, 
        lambda: { 
          functions: [], 
          loading: false, 
          error: e.response?.data?.error_message || "Failed to fetch Lambda data" 
        } 
      }));
    }
  };

  const refreshRedisData = async () => {
    setInfrastructureData(prev => ({ ...prev, redis: { ...prev.redis, loading: true } }));
    try {
      const redisResp = await API.get(`/redis/fetch-clusters-summary`, {
        params: { fresh: "true" },
      });
      setInfrastructureData(prev => ({ 
        ...prev, 
        redis: { 
          clusters: redisResp.data.clusters || [], 
          loading: false, 
          error: null 
        } 
      }));
    } catch (e) {
      setInfrastructureData(prev => ({ 
        ...prev, 
        redis: { 
          clusters: [], 
          loading: false, 
          error: e.response?.data?.error_message || "Failed to fetch Redis data" 
        } 
      }));
    }
  };

  const refreshMSKData = async () => {
    setInfrastructureData(prev => ({ ...prev, msk: { ...prev.msk, loading: true } }));
    try {
      const mskResp = await API.get(`/msk/fetch-clusters-summary`, {
        params: { fresh: "true" },
      });
      setInfrastructureData(prev => ({ 
        ...prev, 
        msk: { 
          clusters: mskResp.data.clusters || [], 
          loading: false, 
          error: null 
        } 
      }));
    } catch (e) {
      setInfrastructureData(prev => ({ 
        ...prev, 
        msk: { 
          clusters: [], 
          loading: false, 
          error: e.response?.data?.error_message || "Failed to fetch MSK data" 
        } 
      }));
    }
  };

  const refreshLoadBalancerData = async () => {
    setInfrastructureData(prev => ({ ...prev, loadbalancer: { ...prev.loadbalancer, loading: true } }));
    try {
      const lbResp = await API.get(`/loadbalancer/fetch-load-balancers-summary`, {
        params: { fresh: "true" },
      });
      setInfrastructureData(prev => ({ 
        ...prev, 
        loadbalancer: { 
          loadBalancers: lbResp.data.load_balancers || [], 
          loading: false, 
          error: null 
        } 
      }));
    } catch (e) {
      setInfrastructureData(prev => ({ 
        ...prev, 
        loadbalancer: { 
          loadBalancers: [], 
          loading: false, 
          error: e.response?.data?.error_message || "Failed to fetch Load Balancer data" 
        } 
      }));
    }
  };

  // Fetch all infrastructure data (for global refresh)
  const fetchAllInfrastructureData = async (fresh = false) => {
    setLoading(true);
    try {
      // Fetch EC2 data
      setInfrastructureData(prev => ({ ...prev, ec2: { ...prev.ec2, loading: true } }));
      try {
        const ec2Resp = await API.get(`/ec2-details/fetch-instance-summary`, {
          params: { fresh: fresh ? "true" : "false" },
        });
        setInfrastructureData(prev => ({ 
          ...prev, 
          ec2: { 
            instances: ec2Resp.data.instances || [], 
            loading: false, 
            error: null 
          } 
        }));
      } catch (e) {
        setInfrastructureData(prev => ({ 
          ...prev, 
          ec2: { 
            instances: [], 
            loading: false, 
            error: e.response?.data?.error_message || "Failed to fetch EC2 data" 
          } 
        }));
      }

      // Fetch ECS data
      setInfrastructureData(prev => ({ ...prev, ecs: { ...prev.ecs, loading: true } }));
      try {
        const [ecsClustersResp, ecsServicesResp] = await Promise.all([
          API.get(`/ecs/fetch-clusters-summary`, { params: { fresh: fresh ? "true" : "false" } }),
          API.get(`/ecs/fetch-services-summary`, { params: { fresh: fresh ? "true" : "false" } })
        ]);
        setInfrastructureData(prev => ({ 
          ...prev, 
          ecs: { 
            clusters: ecsClustersResp.data.clusters || [], 
            services: ecsServicesResp.data.services || [], 
            loading: false, 
            error: null 
          } 
        }));
      } catch (e) {
        setInfrastructureData(prev => ({ 
          ...prev, 
          ecs: { 
            clusters: [], 
            services: [], 
            loading: false, 
            error: e.response?.data?.error_message || "Failed to fetch ECS data" 
          } 
        }));
      }

      // Fetch EKS data
      setInfrastructureData(prev => ({ ...prev, eks: { ...prev.eks, loading: true } }));
      try {
        const eksResp = await API.get(`/eks/fetch-clusters-summary`, {
          params: { fresh: fresh ? "true" : "false" },
        });
        setInfrastructureData(prev => ({ 
          ...prev, 
          eks: { 
            clusters: eksResp.data.clusters || [], 
            loading: false, 
            error: null 
          } 
        }));
      } catch (e) {
        setInfrastructureData(prev => ({ 
          ...prev, 
          eks: { 
            clusters: [], 
            loading: false, 
            error: e.response?.data?.error_message || "Failed to fetch EKS data" 
          } 
        }));
      }

      // Fetch Lambda data
      setInfrastructureData(prev => ({ ...prev, lambda: { ...prev.lambda, loading: true } }));
      try {
        const lambdaResp = await API.get(`/lambda/fetch-functions-summary`, {
          params: { fresh: fresh ? "true" : "false" },
        });
        setInfrastructureData(prev => ({ 
          ...prev, 
          lambda: { 
            functions: lambdaResp.data.functions || [], 
            loading: false, 
            error: null 
          } 
        }));
      } catch (e) {
        setInfrastructureData(prev => ({ 
          ...prev, 
          lambda: { 
            functions: [], 
            loading: false, 
            error: e.response?.data?.error_message || "Failed to fetch Lambda data" 
          } 
        }));
      }

      // Fetch Redis data
      setInfrastructureData(prev => ({ ...prev, redis: { ...prev.redis, loading: true } }));
      try {
        const redisResp = await API.get(`/redis/fetch-clusters-summary`, {
          params: { fresh: fresh ? "true" : "false" },
        });
        setInfrastructureData(prev => ({ 
          ...prev, 
          redis: { 
            clusters: redisResp.data.clusters || [], 
            loading: false, 
            error: null 
          } 
        }));
      } catch (e) {
        setInfrastructureData(prev => ({ 
          ...prev, 
          redis: { 
            clusters: [], 
            loading: false, 
            error: e.response?.data?.error_message || "Failed to fetch Redis data" 
          } 
        }));
      }

      // Fetch MSK data
      setInfrastructureData(prev => ({ ...prev, msk: { ...prev.msk, loading: true } }));
      try {
        const mskResp = await API.get(`/msk/fetch-clusters-summary`, {
          params: { fresh: fresh ? "true" : "false" },
        });
        setInfrastructureData(prev => ({ 
          ...prev, 
          msk: { 
            clusters: mskResp.data.clusters || [], 
            loading: false, 
            error: null 
          } 
        }));
      } catch (e) {
        setInfrastructureData(prev => ({ 
          ...prev, 
          msk: { 
            clusters: [], 
            loading: false, 
            error: e.response?.data?.error_message || "Failed to fetch MSK data" 
          } 
        }));
      }

      // Fetch Load Balancer data
      setInfrastructureData(prev => ({ ...prev, loadbalancer: { ...prev.loadbalancer, loading: true } }));
      try {
        const lbResp = await API.get(`/loadbalancer/fetch-load-balancers-summary`, {
          params: { fresh: fresh ? "true" : "false" },
        });
        setInfrastructureData(prev => ({ 
          ...prev, 
          loadbalancer: { 
            loadBalancers: lbResp.data.load_balancers || [], 
            loading: false, 
            error: null 
          } 
        }));
      } catch (e) {
        setInfrastructureData(prev => ({ 
          ...prev, 
          loadbalancer: { 
            loadBalancers: [], 
            loading: false, 
            error: e.response?.data?.error_message || "Failed to fetch Load Balancer data" 
          } 
        }));
      }

    } catch (e) {
      showErrorModal(e.response?.data?.error_message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllInfrastructureData();
  }, []);

  // Global search functionality
  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return null;

    const searchTerm = globalSearch.toLowerCase();
    const results = {
      ec2: [],
      ecs: [],
      eks: [],
      lambda: [],
      redis: [],
      msk: [],
      loadbalancer: []
    };

    // Search EC2 instances
    results.ec2 = infrastructureData.ec2.instances.filter(instance => 
      instance.instance_name?.toLowerCase().includes(searchTerm) ||
      instance.private_ip?.toLowerCase().includes(searchTerm) ||
      instance.public_ip?.toLowerCase().includes(searchTerm) ||
      instance.instance_id?.toLowerCase().includes(searchTerm)
    );

    // Search ECS clusters and services
    results.ecs = [
      ...infrastructureData.ecs.clusters.filter(cluster => 
        cluster.cluster_name?.toLowerCase().includes(searchTerm) ||
        cluster.cluster_arn?.toLowerCase().includes(searchTerm) ||
        cluster.private_ips?.some(ip => ip.toLowerCase().includes(searchTerm)) ||
        cluster.public_ips?.some(ip => ip.toLowerCase().includes(searchTerm))
      ),
      ...infrastructureData.ecs.services.filter(service => 
        service.service_name?.toLowerCase().includes(searchTerm) ||
        service.cluster_name?.toLowerCase().includes(searchTerm) ||
        service.service_arn?.toLowerCase().includes(searchTerm) ||
        service.private_ips?.some(ip => ip.toLowerCase().includes(searchTerm)) ||
        service.public_ips?.some(ip => ip.toLowerCase().includes(searchTerm))
      )
    ];

    // Search EKS clusters
    results.eks = infrastructureData.eks.clusters.filter(cluster => 
      cluster.cluster_name?.toLowerCase().includes(searchTerm) ||
      cluster.cluster_arn?.toLowerCase().includes(searchTerm) ||
      cluster.private_ips?.some(ip => ip.toLowerCase().includes(searchTerm)) ||
      cluster.public_ips?.some(ip => ip.toLowerCase().includes(searchTerm))
    );

    // Search Lambda functions
    results.lambda = infrastructureData.lambda.functions.filter(func => 
      func.function_name?.toLowerCase().includes(searchTerm) ||
      func.function_arn?.toLowerCase().includes(searchTerm)
    );

    // Search Redis clusters
    results.redis = infrastructureData.redis.clusters.filter(cluster => 
      cluster.replication_group_id?.toLowerCase().includes(searchTerm) ||
      cluster.description?.toLowerCase().includes(searchTerm)
    );

    // Search MSK clusters
    results.msk = infrastructureData.msk.clusters.filter(cluster => 
      cluster.cluster_name?.toLowerCase().includes(searchTerm) ||
      cluster.cluster_arn?.toLowerCase().includes(searchTerm)
    );

    // Search Load Balancers
    results.loadbalancer = infrastructureData.loadbalancer.loadBalancers.filter(lb => 
      lb.load_balancer_name?.toLowerCase().includes(searchTerm) ||
      lb.load_balancer_arn?.toLowerCase().includes(searchTerm) ||
      lb.load_balancer_type?.toLowerCase().includes(searchTerm) ||
      lb.private_ips?.some(ip => ip.toLowerCase().includes(searchTerm)) ||
      lb.public_ips?.some(ip => ip.toLowerCase().includes(searchTerm))
    );

    return results;
  }, [globalSearch, infrastructureData]);



  const renderTabContent = () => {
    const currentTab = INFRASTRUCTURE_TABS[activeTab];
    
    switch (currentTab.id) {
      case 'ec2':
        return (
          <EC2Tab 
            data={infrastructureData.ec2}
            globalSearch={globalSearch}
            globalSearchResults={globalSearchResults?.ec2}
            onRefresh={refreshEC2Data}
          />
        );
      case 'ecs':
        return (
          <ECSTab 
            data={infrastructureData.ecs}
            globalSearch={globalSearch}
            globalSearchResults={globalSearchResults?.ecs}
            onRefresh={refreshECSData}
          />
        );
      case 'eks':
        return (
          <EKSTab 
            data={infrastructureData.eks}
            globalSearch={globalSearch}
            globalSearchResults={globalSearchResults?.eks}
            onRefresh={refreshEKSData}
          />
        );
      case 'lambda':
        return (
          <LambdaTab 
            data={infrastructureData.lambda}
            globalSearch={globalSearch}
            globalSearchResults={globalSearchResults?.lambda}
            onRefresh={refreshLambdaData}
          />
        );
      case 'redis':
        return (
          <RedisTab 
            data={infrastructureData.redis}
            globalSearch={globalSearch}
            globalSearchResults={globalSearchResults?.redis}
            onRefresh={refreshRedisData}
          />
        );
      case 'msk':
        return (
          <MSKTab 
            data={infrastructureData.msk}
            globalSearch={globalSearch}
            globalSearchResults={globalSearchResults?.msk}
            onRefresh={refreshMSKData}
          />
        );
      case 'loadbalancer':
        return (
          <LoadBalancerTab 
            data={infrastructureData.loadbalancer}
            globalSearch={globalSearch}
            globalSearchResults={globalSearchResults?.loadbalancer}
            onRefresh={refreshLoadBalancerData}
          />
        );
      default:
        return null;
    }
  };

  const totalItems = useMemo(() => {
    // If global search is active, show filtered counts
    if (globalSearch && globalSearchResults) {
      return {
        ec2: globalSearchResults.ec2.length,
        ecs: globalSearchResults.ecs.length,
        eks: globalSearchResults.eks.length,
        lambda: globalSearchResults.lambda.length,
        redis: globalSearchResults.redis.length,
        msk: globalSearchResults.msk.length,
        loadbalancer: globalSearchResults.loadbalancer.length
      };
    }
    
    // Otherwise show total counts
    return {
      ec2: infrastructureData.ec2.instances.length,
      ecs: infrastructureData.ecs.clusters.length + infrastructureData.ecs.services.length,
      eks: infrastructureData.eks.clusters.length,
      lambda: infrastructureData.lambda.functions.length,
      redis: infrastructureData.redis.clusters.length,
      msk: infrastructureData.msk.clusters.length,
      loadbalancer: infrastructureData.loadbalancer.loadBalancers.length
    };
  }, [infrastructureData, globalSearch, globalSearchResults]);

  return (
    <Box
      ref={wrapperRef}
      sx={{
        position: "relative",
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {openErrorModal && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(4px)",
            zIndex: 1200,
          }}
        />
      )}

      {/* Header Section with Logo and Title */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CloudRoundedIcon sx={{ color: HEADER_ACCENT }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AWS Resources
          </Typography>
        </Box>

        <StatusChip
          label={`${Object.values(infrastructureData).reduce((total, category) => {
            if (category.instances) return total + category.instances.length;
            if (category.clusters) return total + category.clusters.length;
            if (category.services) return total + category.services.length;
            if (category.functions) return total + category.functions.length;
            if (category.loadBalancers) return total + category.loadBalancers.length;
            return total;
          }, 0)} resources`}
          color="#60A5FA"
          Icon={WidgetsIcon}
        />
      </Box>

      <SectionFilterBar
        searchPlaceholder="Search across all infrastructure by name, IP, or ID..."
        searchValue={globalSearch}
        onSearchChange={(e) => handleGlobalSearchChange(e.target.value)}
        onSearchClear={clearGlobalSearch}
        searchSx={{ flex: "1 1 260px", minWidth: 220, maxWidth: 420 }}
        selects={[]}
        showClearFilters={false}
        onClearFilters={clearGlobalSearch}
        actions={
          <Tooltip title="Refresh all data">
            <span>
              <IconButton
                onClick={() => fetchAllInfrastructureData(true)}
                disabled={loading}
                sx={tintedIconButtonSx("#60A5FA")}
              >
                {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        }
      />

        {globalSearch && globalSearchResults && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, opacity: 0.8 }}>
              Global search results for &quot;{globalSearch}&quot;:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {Object.entries(globalSearchResults).map(([type, results]) => {
                if (results.length === 0) return null;
                const tab = INFRASTRUCTURE_TABS.find((t) => t.id === type);
                if (!tab) return null;
                return (
                  <StatusChip
                    key={type}
                    label={`${tab.label}: ${results.length}`}
                    color={tab.color}
                    Icon={tab.iconComponent}
                    onClick={() => {
                      const tabIndex = INFRASTRUCTURE_TABS.findIndex((t) => t.id === type);
                      if (tabIndex !== -1) handleTabChange(null, tabIndex);
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        )}

      {/* Horizontal Tabs */}
      <Paper
        sx={{
          mb: 2,
          borderRadius: "12px",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          overflow: "hidden",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              alignItems: 'center',
              textAlign: 'center',
              minHeight: 64,
              padding: '12px 16px',
              '&.Mui-selected': {
                backgroundColor: 'action.selected',
              },
            },
          }}
        >
          {INFRASTRUCTURE_TABS.map((tab) => (
            <Tab
              key={tab.id}
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ color: tab.color }}>{tab.icon}</Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {tab.label}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {totalItems[tab.id]} items
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                  borderBottom: 2,
                  borderColor: tab.color,
                },
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderTabContent()}
      </Box>

      <ErrorModal
        wrapperRef={wrapperRef}
        open={openErrorModal}
        error={error}
        onClose={() => setOpenErrorModal(false)}
      />
    </Box>
  );
};

export default AWSResources;
