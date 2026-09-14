// Static + mutable sample data for demo mode (GitHub Pages, no real backend).
// Shapes here mirror the FastAPI response envelopes in backend/models/*.py so
// components render exactly as they would against the real API. Collections
// are generated (with a fixed seed, so every visitor sees the same data) to
// fill out the tables the way a real fleet would, rather than 4-6 hand-typed
// rows.

export const REGIONS = ["us-east-1", "ap-southeast-1"];
export const ALL_REGIONS = [...REGIONS, "eu-west-1"];
export const PLATFORMS = ["Java", "C++"];

export const ROLE_PERMISSIONS = {
  admin: {
    view_components: true,
    add_components: true,
    view_component_tree: true,
    view_schedules: true,
    add_schedules: true,
    run_lambda: true,
    view_server_details: true,
    view_routes: true,
    view_server_control: true,
    start_stop_servers: true,
    restart_watcher: true,
    restart_component: true,
    configure_watcher: true,
    view_component_logs: true,
    download_component_logs: true,
    user_management: true,
  },
  feedops: {
    view_components: true,
    add_components: true,
    view_component_tree: true,
    view_schedules: true,
    add_schedules: true,
    run_lambda: true,
    view_server_details: true,
    view_routes: true,
    view_server_control: true,
    start_stop_servers: true,
    restart_watcher: true,
    restart_component: true,
    configure_watcher: true,
    view_component_logs: true,
    download_component_logs: true,
    user_management: false,
  },
  developer: {
    view_components: true,
    add_components: false,
    view_component_tree: true,
    view_schedules: true,
    add_schedules: false,
    run_lambda: false,
    view_server_details: true,
    view_routes: true,
    view_server_control: true,
    start_stop_servers: true,
    restart_watcher: false,
    restart_component: false,
    configure_watcher: false,
    view_component_logs: true,
    download_component_logs: false,
    user_management: false,
  },
  viewer: {
    view_components: true,
    add_components: false,
    view_component_tree: true,
    view_schedules: true,
    add_schedules: false,
    run_lambda: false,
    view_server_details: true,
    view_routes: true,
    view_server_control: true,
    start_stop_servers: false,
    restart_watcher: false,
    restart_component: false,
    configure_watcher: false,
    view_component_logs: false,
    download_component_logs: false,
    user_management: false,
  },
};

export const DEMO_USER = {
  id: 1,
  username: "demo.admin",
  auth_provider: "local",
  external_id: null,
  display_name: "Demo Admin",
  role: { name: "admin", permissions: ROLE_PERMISSIONS.admin },
};

export const managedUsers = [
  { id: 1, username: "demo.admin", role_name: "admin" },
  { id: 2, username: "j.doe", role_name: "feedops" },
  { id: 3, username: "a.smith", role_name: "developer" },
  { id: 4, username: "r.silva", role_name: "viewer" },
];

const now = () => Math.floor(Date.now() / 1000);
const isoNow = () => new Date().toISOString();

// ---- deterministic PRNG so every visitor sees the same "random" data ----
function mulberry32(seed) {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const int = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const hex = (len) => {
  let s = "";
  for (let i = 0; i < len; i += 1) s += Math.floor(rng() * 16).toString(16);
  return s;
};
const daysAgoIso = (days) => new Date(Date.now() - days * 86400000).toISOString();

// ---- EC2 instances (mutable so start/stop actions feel real within a session) ----
const INSTANCE_ROLE_POOL = [
  "web", "api", "auth", "cache", "worker", "queue", "search", "gateway",
  "proxy", "scheduler", "report", "ingest", "export", "notify", "billing",
  "metrics", "log", "session", "cdn-edge", "image", "email", "webhook",
  "audit", "backup", "etl", "stream", "ml-infer", "config", "feed", "sync",
];
const INSTANCE_TYPE_POOL = [
  "t3.micro", "t3.small", "t3.medium", "t3.large",
  "m6i.large", "m6i.xlarge", "r6g.large", "r6g.xlarge", "c6i.large", "c6i.xlarge",
];
const ASSET_CUSTODIANS = ["Platform Engineering", "Data Engineering", "SRE Team", "Payments Team", "Growth Team"];

const HERO_INSTANCES = [
  { region: "us-east-1", instance_name: "web-01", instance_type: "t3.large", private_ip: "10.0.1.11", public_ip: "54.210.10.11", instance_status: "running", asset_custodian: "Platform Engineering" },
  { region: "us-east-1", instance_name: "web-02", instance_type: "t3.large", private_ip: "10.0.1.12", public_ip: "54.210.10.12", instance_status: "running", asset_custodian: "Platform Engineering" },
  { region: "us-east-1", instance_name: "api-01", instance_type: "t3.medium", private_ip: "10.0.1.20", public_ip: null, instance_status: "stopped", asset_custodian: "Platform Engineering" },
  { region: "ap-southeast-1", instance_name: "db-replica-01", instance_type: "r6g.large", private_ip: "10.0.2.11", public_ip: null, instance_status: "running", asset_custodian: "Data Engineering" },
  { region: "ap-southeast-1", instance_name: "batch-worker-01", instance_type: "m6i.large", private_ip: "10.0.2.20", public_ip: null, instance_status: "running", asset_custodian: "Data Engineering" },
  { region: "ap-southeast-1", instance_name: "jump-host", instance_type: "t3.micro", private_ip: "10.0.2.30", public_ip: "54.220.30.30", instance_status: "stopped", asset_custodian: "SRE Team" },
];

const INSTANCE_COUNT = 100;
const regionOctetBase = { "us-east-1": 40, "ap-southeast-1": 40 };
const regionOctet3 = { "us-east-1": 1, "ap-southeast-1": 2 };
const regionCounters = { "us-east-1": 0, "ap-southeast-1": 0 };

function generatedInstance(index) {
  const region = REGIONS[index % REGIONS.length];
  const seq = regionCounters[region]++;
  const octet4 = regionOctetBase[region] + seq;
  const role = pick(INSTANCE_ROLE_POOL);
  const status = rng() < 0.82 ? "running" : "stopped";
  const hasPublicIp = rng() < 0.2;
  return {
    region,
    instance_name: `${role}-${String(seq + 1).padStart(2, "0")}`,
    instance_type: pick(INSTANCE_TYPE_POOL),
    instance_id: `i-0${hex(17)}`,
    private_ip: `10.0.${regionOctet3[region]}.${octet4}`,
    public_ip: hasPublicIp ? `54.${regionOctet3[region] === 1 ? 210 : 220}.${int(10, 99)}.${int(10, 250)}` : null,
    instance_status: status,
    asset_custodian: pick(ASSET_CUSTODIANS),
  };
}

export const instances = [
  ...HERO_INSTANCES.map((inst, i) => ({ ...inst, instance_id: `i-0demo0000000${(10 + i).toString(16)}` })),
  ...Array.from({ length: INSTANCE_COUNT - HERO_INSTANCES.length }, (_, i) => generatedInstance(i)),
];

export function findInstance(instanceId) {
  return instances.find((i) => i.instance_id === instanceId);
}

export function instanceDetails(instanceId) {
  const base = findInstance(instanceId) || instances[0];
  return {
    instance_name: base.instance_name,
    instance_type: base.instance_type,
    instance_id: base.instance_id,
    instance_status: base.instance_status,
    instance_profile: "sre-dashboard-instance-role",
    launch_time: "2025-01-14 08:32:10+00:00",
    status_checks: {
      system_status_check: "ok",
      instance_status_check: "ok",
      attached_ebs_status_checks: ["ok"],
    },
    ami_details: { ami_id: "ami-0demoami12345", ami_name: "al2023-ami-demo" },
    network_details: {
      vpc_name: "sre-dashboard-vpc",
      vpc_id: "vpc-0demo1234",
      subnet_name: `${base.region}-private-a`,
      subnet_id: "subnet-0demo1234",
      security_group_name: ["default", "app-sg"],
      security_group_id: ["sg-0demo1234"],
      region: base.region,
      availability_zone: `${base.region}a`,
      private_ip: base.private_ip,
      public_ip: base.public_ip,
      public_ip_is_eip: Boolean(base.public_ip),
      eip_allocation_id: base.public_ip ? "eipalloc-0demo1234" : null,
    },
    tags: [
      { Key: "Name", Value: base.instance_name },
      { Key: "AssetCustodian", Value: base.asset_custodian },
      { Key: "Environment", Value: "demo" },
    ],
    storages: [
      { DeviceName: "/dev/xvda", Ebs: { VolumeId: "vol-0demo1234", Size: 30 } },
    ],
  };
}

// ---- ECS ----
const ECS_CLUSTER_NAMES = [
  "prod-cluster", "batch-cluster", "payments-cluster", "search-cluster",
  "notifications-cluster", "media-cluster", "reporting-cluster", "internal-tools-cluster",
];
export const ecsClusters = ECS_CLUSTER_NAMES.map((name, i) => {
  const region = REGIONS[i % REGIONS.length];
  const activeServices = int(2, 8);
  return {
    region,
    cluster_name: name,
    cluster_arn: `arn:aws:ecs:${region}:000000000000:cluster/${name}`,
    status: "ACTIVE",
    active_services_count: activeServices,
    running_tasks_count: activeServices * int(2, 4),
    pending_tasks_count: rng() < 0.2 ? int(1, 2) : 0,
    private_ips: [`10.0.${regionOctet3[region]}.${int(40, 80)}`],
    public_ips: [],
  };
});

const SERVICE_NAME_POOL = [
  "web-service", "api-service", "worker-service", "auth-service", "payments-service",
  "notification-service", "search-service", "media-transcoder", "report-service",
  "webhook-dispatcher", "billing-service", "session-service",
];
export const ecsServices = Array.from({ length: 100 }, (_, i) => {
  const cluster = ecsClusters[i % ecsClusters.length];
  const desired = int(1, 6);
  return {
    region: cluster.region,
    cluster_name: cluster.cluster_name,
    service_name: `${pick(SERVICE_NAME_POOL)}-${String(i + 1).padStart(3, "0")}`,
    service_arn: `arn:aws:ecs:${cluster.region}:000000000000:service/${cluster.cluster_name}/svc-${i + 1}`,
    status: "ACTIVE",
    desired_count: desired,
    running_count: rng() < 0.9 ? desired : desired - 1,
    pending_count: rng() < 0.1 ? 1 : 0,
    launch_type: rng() < 0.7 ? "FARGATE" : "EC2",
    private_ips: [`10.0.${regionOctet3[cluster.region]}.${int(40, 80)}`],
    public_ips: [],
  };
});

// ---- EKS ----
const EKS_CLUSTER_NAMES = [
  "analytics-cluster", "ml-platform-cluster", "streaming-cluster", "edge-cluster",
  "data-pipeline-cluster", "internal-apis-cluster", "sandbox-cluster", "staging-cluster",
  "shared-services-cluster", "batch-jobs-cluster",
];
export const eksClusters = EKS_CLUSTER_NAMES.map((name, i) => {
  const region = REGIONS[i % REGIONS.length];
  return {
    region,
    cluster_name: name,
    cluster_arn: `arn:aws:eks:${region}:000000000000:cluster/${name}`,
    status: "ACTIVE",
    version: pick(["1.28", "1.29", "1.30"]),
    platform_version: `eks.${int(2, 8)}`,
    endpoint: `https://demo-${name}.eks.amazonaws.com`,
    created_at: daysAgoIso(int(60, 400)),
    private_ips: [`10.0.${regionOctet3[region]}.${int(50, 90)}`],
    public_ips: [],
  };
});

// ---- Lambda ----
const LAMBDA_NAME_POOL = [
  "event-creator", "report-generator", "webhook-relay", "image-resizer", "email-sender",
  "log-forwarder", "cost-reporter", "cleanup-job", "notification-dispatcher", "data-exporter",
  "invoice-generator", "alert-router", "session-cleaner", "cache-invalidator", "audit-logger",
];
export const lambdaFunctions = [
  {
    region: "us-east-1",
    function_name: "lambda-event-creator",
    function_arn: "arn:aws:lambda:us-east-1:000000000000:function:lambda-event-creator",
    runtime: "python3.12",
    memory_size: 256,
    timeout: 30,
    last_modified: daysAgoIso(25),
    code_size: 5242880,
    description: "Creates EC2 start/stop schedule events.",
    state: "Active",
  },
  {
    region: "ap-southeast-1",
    function_name: "lambda-event-creator",
    function_arn: "arn:aws:lambda:ap-southeast-1:000000000000:function:lambda-event-creator",
    runtime: "python3.12",
    memory_size: 256,
    timeout: 30,
    last_modified: daysAgoIso(25),
    code_size: 5242880,
    description: "Creates EC2 start/stop schedule events.",
    state: "Active",
  },
  ...Array.from({ length: 98 }, (_, i) => {
    const region = REGIONS[i % REGIONS.length];
    const name = `${pick(LAMBDA_NAME_POOL)}-${String(i + 1).padStart(3, "0")}`;
    return {
      region,
      function_name: name,
      function_arn: `arn:aws:lambda:${region}:000000000000:function:${name}`,
      runtime: pick(["python3.12", "python3.11", "nodejs20.x"]),
      memory_size: pick([128, 256, 512, 1024]),
      timeout: pick([15, 30, 60, 120]),
      last_modified: daysAgoIso(int(1, 200)),
      code_size: int(500000, 15000000),
      description: `Demo function for ${name.replace(/-\d+$/, "").replaceAll("-", " ")}.`,
      state: "Active",
    };
  }),
];

// ---- MSK ----
const MSK_CLUSTER_NAMES = [
  "events-cluster", "orders-cluster", "clickstream-cluster", "audit-cluster",
  "payments-events-cluster", "notifications-cluster", "cdc-cluster", "metrics-cluster",
  "search-index-cluster", "logs-cluster",
];
export const mskClusters = MSK_CLUSTER_NAMES.map((name, i) => {
  const region = REGIONS[i % REGIONS.length];
  return {
    region,
    cluster_name: name,
    cluster_arn: `arn:aws:kafka:${region}:000000000000:cluster/${name}`,
    state: "ACTIVE",
    kafka_version: pick(["3.5.1", "3.6.0", "3.4.0"]),
    number_of_broker_nodes: pick([3, 6, 9]),
    cluster_type: "provisioned",
  };
});

// ---- Redis / ElastiCache ----
const REDIS_NAME_POOL = [
  "sessions-cache", "app-cache", "rate-limit-cache", "leaderboard-cache", "search-cache",
  "pricing-cache", "feature-flags-cache", "queue-broker", "pubsub-broker", "geo-cache",
];
export const redisClusters = Array.from({ length: 20 }, (_, i) => {
  const region = REGIONS[i % REGIONS.length];
  return {
    region,
    replication_group_id: `${pick(REDIS_NAME_POOL)}-${String(i + 1).padStart(2, "0")}`,
    description: "Demo Redis replication group",
    status: "available",
    node_type: pick(["cache.t3.medium", "cache.r6g.large", "cache.r6g.xlarge"]),
    num_cache_nodes: pick([1, 2, 3]),
    engine: "redis",
    engine_version: pick(["7.0", "7.1"]),
    port: 6379,
  };
});

// ---- Load Balancers ----
const LB_NAME_POOL = [
  "public-alb", "internal-nlb", "api-alb", "admin-alb", "payments-alb",
  "media-alb", "search-alb", "webhook-alb", "partner-alb", "mobile-api-alb",
];
export const loadBalancers = Array.from({ length: 50 }, (_, i) => {
  const region = REGIONS[i % REGIONS.length];
  const isAlb = rng() < 0.75;
  const internal = rng() < 0.4;
  const name = `${pick(LB_NAME_POOL)}-${String(i + 1).padStart(2, "0")}`;
  return {
    region,
    load_balancer_name: name,
    load_balancer_arn: `arn:aws:elasticloadbalancing:${region}:000000000000:loadbalancer/${isAlb ? "app" : "net"}/${name}/${hex(8)}`,
    load_balancer_type: isAlb ? "application" : "network",
    scheme: internal ? "internal" : "internet-facing",
    state: "active",
    vpc_id: "vpc-0demo1234",
    availability_zones: [{ ZoneName: `${region}a` }, { ZoneName: `${region}b` }],
    security_groups: ["sg-0demo1234"],
    ip_address_type: "ipv4",
    private_ips: [`10.0.${regionOctet3[region]}.${int(60, 99)}`],
    public_ips: internal ? [] : [`54.${regionOctet3[region] === 1 ? 210 : 220}.${int(10, 99)}.${int(10, 250)}`],
  };
});

// ---- Route 53 ----
const ROUTE53_NAME_POOL = [
  "alertservice", "calcserver-ap", "calcserver-us", "file-service", "notify-service",
  "webhook-gateway", "reporting-service", "auth-gateway", "media-service", "partner-gateway",
];
export const route53Zones = ROUTE53_NAME_POOL.map((name, i) => {
  const primaryHealthy = rng() < 0.85;
  return {
    hosted_zone: `${name}.example.com.`,
    main_url: `${name}.example-internal.com`,
    primary: {
      dns_name: `${name}.example.com`,
      alias_target: "alb-primary.us-east-1.elb.amazonaws.com",
      location: "NV",
      health_check_id: `hc-demo-${i * 2 + 1}`,
      health_status: primaryHealthy ? "Healthy" : "Unhealthy",
    },
    secondary: {
      dns_name: `${name}.example.com`,
      alias_target: "alb-secondary.ap-southeast-1.elb.amazonaws.com",
      location: "SG",
      health_check_id: `hc-demo-${i * 2 + 2}`,
      health_status: "Healthy",
    },
    active_target: primaryHealthy ? "primary" : "secondary",
    active_alias_target: primaryHealthy
      ? "alb-primary.us-east-1.elb.amazonaws.com"
      : "alb-secondary.ap-southeast-1.elb.amazonaws.com",
    active_location: primaryHealthy ? "NV" : "NV",
    routing_reason: primaryHealthy
      ? "Primary record is serving traffic"
      : "Primary record is unhealthy, so traffic has failed over to secondary",
  };
});

// ---- Components (Component DB) ----
const HERO_COMPONENTS = [
  { region: "us-east-1", ip: "10.0.1.11", component_name: "web-app", platform: "Java", comp_path: "/apps/web-app", comp_version: "3.4.1", pipeline: "configured", watcher: "configured", release_date: "2026-08-01T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/web-app", category: "component", asset_custodian: "Platform Engineering" },
  { region: "us-east-1", ip: "10.0.1.12", component_name: "web-app", platform: "Java", comp_path: "/apps/web-app", comp_version: "3.4.1", pipeline: "configured", watcher: "configured", release_date: "2026-08-01T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/web-app", category: "component", asset_custodian: "Platform Engineering" },
  { region: "us-east-1", ip: "10.0.1.20", component_name: "api-service", platform: "Java", comp_path: "/apps/api-service", comp_version: "1.9.0", pipeline: "configured", watcher: "configured", release_date: "2026-07-20T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/api-service", category: "component", asset_custodian: "Platform Engineering" },
  { region: "us-east-1", ip: "10.0.1.20", component_name: "nightly-report", platform: "C++", comp_path: "/apps/nightly-report", comp_version: "1.0.4", pipeline: "unconfigured", watcher: "configured", release_date: "2026-06-11T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/nightly-report", category: "job", asset_custodian: "Platform Engineering" },
  { region: "ap-southeast-1", ip: "10.0.2.11", component_name: "market-feed", platform: "C++", comp_path: "/apps/market-feed", comp_version: "5.2.0", pipeline: "configured", watcher: "configured", release_date: "2026-08-10T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/market-feed", category: "component", asset_custodian: "Data Engineering" },
  { region: "ap-southeast-1", ip: "10.0.2.20", component_name: "batch-worker", platform: "Java", comp_path: "/apps/batch-worker", comp_version: "2.1.3", pipeline: "configured", watcher: "configured", release_date: "2026-08-05T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/batch-worker", category: "component", asset_custodian: "Data Engineering" },
  { region: "ap-southeast-1", ip: "10.0.2.20", component_name: "log-shipper", platform: "C++", comp_path: "/apps/log-shipper", comp_version: "0.9.1", pipeline: "unconfigured", watcher: "configured", release_date: "2026-05-02T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/log-shipper", category: "tool", asset_custodian: "Data Engineering" },
  { region: "ap-southeast-1", ip: "10.0.2.30", component_name: "ssh-jump", platform: "C++", comp_path: "/apps/ssh-jump", comp_version: "1.0.0", pipeline: "unconfigured", watcher: "unconfigured", release_date: "2025-12-01T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/ssh-jump", category: "tool", asset_custodian: "SRE Team" },
];

const COMPONENT_TEMPLATES = [
  { name: "web-app", platform: "Java", category: "component" },
  { name: "api-service", platform: "Java", category: "component" },
  { name: "auth-service", platform: "Java", category: "component" },
  { name: "payments-service", platform: "Java", category: "component" },
  { name: "billing-worker", platform: "C++", category: "job" },
  { name: "notification-service", platform: "Java", category: "component" },
  { name: "search-indexer", platform: "C++", category: "component" },
  { name: "report-generator", platform: "C++", category: "job" },
  { name: "batch-worker", platform: "Java", category: "component" },
  { name: "cache-warmer", platform: "C++", category: "job" },
  { name: "session-manager", platform: "Java", category: "component" },
  { name: "queue-consumer", platform: "Java", category: "component" },
  { name: "data-sync", platform: "C++", category: "component" },
  { name: "log-shipper", platform: "C++", category: "tool" },
  { name: "metrics-collector", platform: "C++", category: "tool" },
  { name: "health-checker", platform: "C++", category: "tool" },
];

const COMPONENT_COUNT = 100;
export const components = [
  ...HERO_COMPONENTS,
  ...Array.from({ length: COMPONENT_COUNT - HERO_COMPONENTS.length }, (_, i) => {
    const inst = instances[(i + HERO_COMPONENTS.length) % instances.length];
    const tpl = COMPONENT_TEMPLATES[i % COMPONENT_TEMPLATES.length];
    const isTool = tpl.category === "tool";
    const watcherConfigured = rng() < 0.9;
    return {
      region: inst.region,
      ip: inst.private_ip,
      component_name: tpl.name,
      platform: tpl.platform,
      comp_path: `/apps/${tpl.name}`,
      comp_version: `${int(1, 6)}.${int(0, 9)}.${int(0, 9)}`,
      pipeline: isTool ? "unconfigured" : rng() < 0.85 ? "configured" : "unconfigured",
      watcher: watcherConfigured ? "configured" : "unconfigured",
      release_date: daysAgoIso(int(1, 120)),
      code_repo_url: `https://gitlab.com/demo-org/${tpl.name}`,
      category: tpl.category,
      asset_custodian: inst.asset_custodian,
    };
  }),
];

export function componentDetail(region, ip, componentName) {
  const match =
    components.find(
      (c) =>
        (!region || c.region === region) &&
        (!ip || c.ip === ip) &&
        (!componentName || c.component_name === componentName)
    ) || components[0];
  return {
    ...match,
    description: `Demo component "${match.component_name}" — sample data for portfolio display.`,
    config_repo_url: match.code_repo_url,
    script_repo_url: match.code_repo_url,
    previous_tag: "v" + (parseFloat(match.comp_version) - 0.1).toFixed(1),
    last_run_time: isoNow(),
    last_update_time: isoNow(),
  };
}

// ---- Server details (Host Details) ----
const OS_POOL = ["Amazon Linux 2023", "Ubuntu 22.04", "Ubuntu 24.04"];
export const serverDetails = instances.map((inst, idx) => {
  const componentsHere = components.filter((c) => c.ip === inst.private_ip);
  const watcherConfigured = inst.instance_status !== "stopped" && rng() < 0.9;
  const compliantRoll = rng();
  return {
    region: inst.region,
    ip: inst.private_ip,
    hostname: inst.instance_name,
    instance_id: inst.instance_id,
    os: OS_POOL[idx % OS_POOL.length],
    boot_time: now() - 3600 * int(2, 720),
    compliant_status: inst.instance_status === "stopped"
      ? "PENDING"
      : compliantRoll < 0.75 ? "COMPLIANT" : compliantRoll < 0.92 ? "PARTIALLY_COMPLIANT" : "PENDING",
    watcher_status: watcherConfigured ? "configured" : "unconfigured",
    watcher_version: watcherConfigured ? "2.3.0" : null,
    watcher_configured_component_count: watcherConfigured ? componentsHere.length : 0,
    tool_component_count: componentsHere.filter((c) => c.category === "tool").length,
    job_component_count: componentsHere.filter((c) => c.category === "job").length,
    component_category_count: componentsHere.filter((c) => c.category === "component").length,
    total_component_count: componentsHere.length,
    tags: { Name: inst.instance_name, AssetCustodian: inst.asset_custodian },
    asset_custodian: inst.asset_custodian,
  };
});

export function serverDetail(region, ip) {
  const row = serverDetails.find((r) => r.region === region && r.ip === ip) || serverDetails[0];
  return {
    ts: now(),
    region: row.region,
    ip: row.ip,
    instance_id: row.instance_id,
    hostname: row.hostname,
    fqdn: `${row.hostname}.internal`,
    all_ips: [row.ip],
    os: row.os,
    os_version: row.os.includes("Ubuntu") ? row.os.split(" ")[1] : "2023",
    os_release: row.os,
    kernel_version: "6.5.0",
    kernel_release: "generic",
    architecture: "x86_64",
    platform: "Linux",
    python_version: "3.11.6",
    current_username: "ec2-user",
    home_directory: "/home/ec2-user",
    watcher_directory: "/opt/watcher",
    apps_directory: "/apps",
    boot_time: row.boot_time,
    vcpus: 2,
    cores: 1,
    total_memory_mb: 8192,
    last_ingested_at: isoNow(),
    compliant_status: row.compliant_status,
    watcher_status: row.watcher_status,
    watcher_version: row.watcher_version,
    crons: ["0 2 * * * /apps/scripts/cleanup.sh"],
  };
}

// ---- Schedules ----
const SCHEDULED_INSTANCE_COUNT = 60;
const scheduledInstances = instances.slice(0, SCHEDULED_INSTANCE_COUNT);

export const instanceSchedules = scheduledInstances.flatMap((inst, idx) => {
  const enabled = rng() < 0.85;
  const rows = [
    {
      instance_id: inst.instance_id,
      region: inst.region,
      private_ip: inst.private_ip,
      instance_name: inst.instance_name,
      action: "stop",
      schedule_enabled: enabled,
      tag_key: "stop_time",
      cron_expression: "0 22 * * 1-5",
      days: "Mon, Tue, Wed, Thu, Fri",
      scheduled_time: enabled ? new Date(Date.now() + 3600 * 1000 * (1 + (idx % 12))).toISOString() : null,
    },
    {
      instance_id: inst.instance_id,
      region: inst.region,
      private_ip: inst.private_ip,
      instance_name: inst.instance_name,
      action: "start",
      schedule_enabled: enabled,
      tag_key: "start_time",
      cron_expression: "0 6 * * 1-5",
      days: "Mon, Tue, Wed, Thu, Fri",
      scheduled_time: enabled ? new Date(Date.now() + 3600 * 1000 * (13 + (idx % 12))).toISOString() : null,
    },
  ];
  return rows;
});

export const schedules = instanceSchedules
  .filter((row) => row.schedule_enabled)
  .slice(0, 24)
  .map((row) => ({
    instance_id: row.instance_id,
    region: row.region,
    private_ip: row.private_ip,
    instance_name: row.instance_name,
    action: row.action,
    schedule_enabled: row.schedule_enabled,
    scheduled_time: row.scheduled_time,
  }));

export const awsIps = REGIONS.reduce((acc, region) => {
  acc[region] = instances
    .filter((i) => i.region === region)
    .map((i) => ({ instance_id: i.instance_id, private_ip: i.private_ip }));
  return acc;
}, {});

// ---- Component tree / watcher status payload ----
const watchedComponents = components.filter((c) => c.watcher === "configured");

export function buildComponentStatusPayload() {
  const data = {};
  watchedComponents.forEach((c) => {
    const key = `${c.ip}:${c.component_name}`;
    data[key] = {
      ip: c.ip,
      region: c.region,
      component: c.component_name,
      ts: now(),
      listen: 8080,
      state: "up",
      needs_to_run: true,
      port_status: "listening",
      uptime_seconds: 3600 * 12,
    };
  });
  return { type: "component_details", data };
}

// ---- Component Map: a hand-built multi-tier graph (upstream feeders -> hub
// -> downstream services -> unmonitored leaf peers) so the map looks like a
// real connection-tracking topology instead of a short flat chain. ----
const UPSTREAM_FEEDERS = [
  { name: "fx-feed-analyzer", ip: "10.0.3.10" },
  { name: "options-feed-analyzer", ip: "10.0.3.11" },
  { name: "cfd-feed-analyzer", ip: "10.0.3.12" },
  { name: "reference-data-reader", ip: "10.0.3.13" },
  { name: "market-data-normalizer", ip: "10.0.3.14" },
  { name: "quote-feed-relay", ip: "10.0.3.15" },
  { name: "historical-data-reader", ip: "10.0.3.16" },
];
const HUB = { name: "quote-gateway", ip: "10.0.1.50" };
const DOWNSTREAM_SERVICES = [
  { name: "region-db-manager", ip: "10.0.4.10" },
  { name: "fixed-income-quoteserver", ip: "10.0.4.11" },
  { name: "asia-secondary-cache", ip: "10.0.4.12" },
  { name: "eu-quoteserver", ip: "10.0.4.13" },
  { name: "us-toplist-service", ip: "10.0.4.14" },
  { name: "feed-connector", ip: "10.0.4.15" },
  { name: "partner-api-gateway", ip: "10.0.4.16" },
];

function leafKey(i) {
  return `203.0.113.${10 + i}-${51000 + i}`;
}

function ensureNode(map, key, kind) {
  if (!map[key]) {
    map[key] = { upstream: [], downstream: [], kind };
  }
  return map[key];
}

// Edges are declared on BOTH ends (the "downstream" node also gets a
// matching "upstream" entry) since the map view centers on whichever node
// is selected and walks its own upstream/downstream lists in either
// direction - a one-sided edge would only ever show up from one end.
function addEdge(map, fromKey, fromKind, toKey, toKind, localPort, remotePort) {
  const from = ensureNode(map, fromKey, fromKind);
  const to = ensureNode(map, toKey, toKind);
  from.downstream.push({ component: toKey, local_port: localPort, remote_port: remotePort });
  to.upstream.push({ component: fromKey, local_port: remotePort, remote_port: localPort });
}

export function componentTreeMap() {
  const map = {};
  const hubKey = `${HUB.ip}:${HUB.name}`;
  ensureNode(map, hubKey, "component");

  UPSTREAM_FEEDERS.forEach((f, i) => {
    addEdge(map, `${f.ip}:${f.name}`, "component", hubKey, "component", 9000 + i, 9100);
  });

  DOWNSTREAM_SERVICES.forEach((s, i) => {
    addEdge(map, hubKey, "component", `${s.ip}:${s.name}`, "component", 9200, 9300 + i);
  });

  let leafIndex = 0;
  DOWNSTREAM_SERVICES.forEach((s, i) => {
    const key = `${s.ip}:${s.name}`;
    const leafCount = 1 + (i % 2);
    for (let j = 0; j < leafCount; j += 1) {
      const leaf = leafKey(leafIndex);
      addEdge(map, key, "component", leaf, "unknown", 9300 + i, 32600 + leafIndex);

      // A couple of branches go one level deeper, like the unmonitored
      // chains seen on a real connection-tracking map.
      if (leafIndex % 3 === 0) {
        const deeperLeaf = leafKey(leafIndex + 1000);
        addEdge(map, leaf, "unknown", deeperLeaf, "unknown", 32600 + leafIndex, 32700 + leafIndex);
      }

      leafIndex += 1;
    }
  });

  return { components: map };
}

// ---- Datadog-style time series ----
export function buildSeries(baseValue, variance, points = 30) {
  const pointlist = [];
  const end = Date.now();
  for (let i = points - 1; i >= 0; i -= 1) {
    const ts = end - i * 60000;
    const value = Math.max(0, baseValue + (Math.sin(i / 3) * variance) + (Math.random() * variance * 0.3));
    pointlist.push([ts, Number(value.toFixed(2))]);
  }
  return pointlist;
}
