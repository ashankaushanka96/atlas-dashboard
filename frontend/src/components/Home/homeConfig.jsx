import CloudIcon from "@mui/icons-material/Cloud";
import StorageIcon from "@mui/icons-material/Storage";
import HubIcon from "@mui/icons-material/Hub";
import FunctionsIcon from "@mui/icons-material/Functions";
import MemoryIcon from "@mui/icons-material/Memory";
import TopicIcon from "@mui/icons-material/Topic";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { API } from "../../services/auth";

export const INFRA_RESOURCE_CONFIG = [
  {
    key: "ec2",
    label: "EC2",
    icon: <CloudIcon fontSize="small" />,
    load: async ({ fresh = false } = {}) => {
      const resp = await API.get("/ec2-details/fetch-instance-summary", {
        params: { fresh: fresh ? "true" : "false" },
      });
      return resp.data.instances || [];
    },
  },
  {
    key: "ecs-clusters",
    label: "ECS Clusters",
    icon: <StorageIcon fontSize="small" />,
    load: async ({ fresh = false } = {}) => {
      const resp = await API.get("/ecs/fetch-clusters-summary", {
        params: { fresh: fresh ? "true" : "false" },
      });
      return resp.data.clusters || [];
    },
  },
  {
    key: "ecs-services",
    label: "ECS Services",
    icon: <StorageIcon fontSize="small" />,
    load: async ({ fresh = false } = {}) => {
      const resp = await API.get("/ecs/fetch-services-summary", {
        params: { fresh: fresh ? "true" : "false" },
      });
      return resp.data.services || [];
    },
  },
  {
    key: "eks",
    label: "EKS",
    icon: <HubIcon fontSize="small" />,
    load: async ({ fresh = false } = {}) => {
      const resp = await API.get("/eks/fetch-clusters-summary", {
        params: { fresh: fresh ? "true" : "false" },
      });
      return resp.data.clusters || [];
    },
  },
  {
    key: "lambda",
    label: "Lambda",
    icon: <FunctionsIcon fontSize="small" />,
    load: async ({ fresh = false } = {}) => {
      const resp = await API.get("/lambda/fetch-functions-summary", {
        params: { fresh: fresh ? "true" : "false" },
      });
      return resp.data.functions || [];
    },
  },
  {
    key: "redis",
    label: "Redis",
    icon: <MemoryIcon fontSize="small" />,
    load: async ({ fresh = false } = {}) => {
      const resp = await API.get("/redis/fetch-clusters-summary", {
        params: { fresh: fresh ? "true" : "false" },
      });
      return resp.data.clusters || [];
    },
  },
  {
    key: "msk",
    label: "MSK",
    icon: <TopicIcon fontSize="small" />,
    load: async ({ fresh = false } = {}) => {
      const resp = await API.get("/msk/fetch-clusters-summary", {
        params: { fresh: fresh ? "true" : "false" },
      });
      return resp.data.clusters || [];
    },
  },
  {
    key: "load-balancers",
    label: "Load Balancers",
    icon: <AccountBalanceIcon fontSize="small" />,
    load: async ({ fresh = false } = {}) => {
      const resp = await API.get("/loadbalancer/fetch-load-balancers-summary", {
        params: { fresh: fresh ? "true" : "false" },
      });
      return resp.data.load_balancers || [];
    },
  },
];
