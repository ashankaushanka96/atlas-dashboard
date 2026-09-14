// Static + mutable sample data for demo mode (GitHub Pages, no real backend).
// Shapes here mirror the FastAPI response envelopes in backend/models/*.py so
// components render exactly as they would against the real API.

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

// ---- EC2 instances (mutable so start/stop actions feel real within a session) ----
export const instances = [
  {
    region: "us-east-1",
    instance_name: "web-01",
    instance_type: "t3.large",
    instance_id: "i-0demo0000000a1b1",
    private_ip: "10.0.1.11",
    public_ip: "54.210.10.11",
    instance_status: "running",
    asset_custodian: "Platform Engineering",
  },
  {
    region: "us-east-1",
    instance_name: "web-02",
    instance_type: "t3.large",
    instance_id: "i-0demo0000000a1b2",
    private_ip: "10.0.1.12",
    public_ip: "54.210.10.12",
    instance_status: "running",
    asset_custodian: "Platform Engineering",
  },
  {
    region: "us-east-1",
    instance_name: "api-01",
    instance_type: "t3.medium",
    instance_id: "i-0demo0000000a1b3",
    private_ip: "10.0.1.20",
    public_ip: null,
    instance_status: "stopped",
    asset_custodian: "Platform Engineering",
  },
  {
    region: "ap-southeast-1",
    instance_name: "db-replica-01",
    instance_type: "r6g.large",
    instance_id: "i-0demo0000000b2c1",
    private_ip: "10.0.2.11",
    public_ip: null,
    instance_status: "running",
    asset_custodian: "Data Engineering",
  },
  {
    region: "ap-southeast-1",
    instance_name: "batch-worker-01",
    instance_type: "m6i.large",
    instance_id: "i-0demo0000000b2c2",
    private_ip: "10.0.2.20",
    public_ip: null,
    instance_status: "running",
    asset_custodian: "Data Engineering",
  },
  {
    region: "ap-southeast-1",
    instance_name: "jump-host",
    instance_type: "t3.micro",
    instance_id: "i-0demo0000000b2c3",
    private_ip: "10.0.2.30",
    public_ip: "54.220.30.30",
    instance_status: "stopped",
    asset_custodian: "SRE Team",
  },
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
export const ecsClusters = [
  {
    region: "us-east-1",
    cluster_name: "prod-cluster",
    cluster_arn: "arn:aws:ecs:us-east-1:000000000000:cluster/prod-cluster",
    status: "ACTIVE",
    active_services_count: 2,
    running_tasks_count: 6,
    pending_tasks_count: 0,
    private_ips: ["10.0.1.40", "10.0.1.41"],
    public_ips: [],
  },
  {
    region: "ap-southeast-1",
    cluster_name: "batch-cluster",
    cluster_arn: "arn:aws:ecs:ap-southeast-1:000000000000:cluster/batch-cluster",
    status: "ACTIVE",
    active_services_count: 1,
    running_tasks_count: 3,
    pending_tasks_count: 1,
    private_ips: ["10.0.2.40"],
    public_ips: [],
  },
];

export const ecsServices = [
  {
    region: "us-east-1",
    cluster_name: "prod-cluster",
    service_name: "web-service",
    service_arn: "arn:aws:ecs:us-east-1:000000000000:service/prod-cluster/web-service",
    status: "ACTIVE",
    desired_count: 4,
    running_count: 4,
    pending_count: 0,
    launch_type: "FARGATE",
    private_ips: ["10.0.1.40"],
    public_ips: [],
  },
  {
    region: "us-east-1",
    cluster_name: "prod-cluster",
    service_name: "api-service",
    service_arn: "arn:aws:ecs:us-east-1:000000000000:service/prod-cluster/api-service",
    status: "ACTIVE",
    desired_count: 2,
    running_count: 2,
    pending_count: 0,
    launch_type: "FARGATE",
    private_ips: ["10.0.1.41"],
    public_ips: [],
  },
  {
    region: "ap-southeast-1",
    cluster_name: "batch-cluster",
    service_name: "worker-service",
    service_arn: "arn:aws:ecs:ap-southeast-1:000000000000:service/batch-cluster/worker-service",
    status: "ACTIVE",
    desired_count: 3,
    running_count: 3,
    pending_count: 1,
    launch_type: "EC2",
    private_ips: ["10.0.2.40"],
    public_ips: [],
  },
];

// ---- EKS ----
export const eksClusters = [
  {
    region: "us-east-1",
    cluster_name: "analytics-cluster",
    cluster_arn: "arn:aws:eks:us-east-1:000000000000:cluster/analytics-cluster",
    status: "ACTIVE",
    version: "1.29",
    platform_version: "eks.5",
    endpoint: "https://demo-analytics-cluster.eks.amazonaws.com",
    created_at: "2024-11-02T10:00:00Z",
    private_ips: ["10.0.1.50"],
    public_ips: [],
  },
];

// ---- Lambda ----
export const lambdaFunctions = [
  {
    region: "us-east-1",
    function_name: "lambda-event-creator",
    function_arn: "arn:aws:lambda:us-east-1:000000000000:function:lambda-event-creator",
    runtime: "python3.12",
    memory_size: 256,
    timeout: 30,
    last_modified: "2026-08-20T09:15:00Z",
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
    last_modified: "2026-08-20T09:15:00Z",
    code_size: 5242880,
    description: "Creates EC2 start/stop schedule events.",
    state: "Active",
  },
  {
    region: "us-east-1",
    function_name: "report-generator",
    function_arn: "arn:aws:lambda:us-east-1:000000000000:function:report-generator",
    runtime: "python3.12",
    memory_size: 512,
    timeout: 60,
    last_modified: "2026-07-11T14:02:00Z",
    code_size: 8388608,
    description: "Generates the nightly compliance report.",
    state: "Active",
  },
];

// ---- MSK ----
export const mskClusters = [
  {
    region: "us-east-1",
    cluster_name: "events-cluster",
    cluster_arn: "arn:aws:kafka:us-east-1:000000000000:cluster/events-cluster",
    state: "ACTIVE",
    kafka_version: "3.5.1",
    number_of_broker_nodes: 3,
    cluster_type: "provisioned",
  },
];

// ---- Redis / ElastiCache ----
export const redisClusters = [
  {
    region: "us-east-1",
    replication_group_id: "sessions-cache",
    description: "Session store",
    status: "available",
    node_type: "cache.r6g.large",
    num_cache_nodes: 2,
    engine: "redis",
    engine_version: "7.1",
    port: 6379,
  },
  {
    region: "ap-southeast-1",
    replication_group_id: "app-cache",
    description: "Application response cache",
    status: "available",
    node_type: "cache.r6g.large",
    num_cache_nodes: 1,
    engine: "redis",
    engine_version: "7.1",
    port: 6379,
  },
];

// ---- Load Balancers ----
export const loadBalancers = [
  {
    region: "us-east-1",
    load_balancer_name: "public-alb",
    load_balancer_arn: "arn:aws:elasticloadbalancing:us-east-1:000000000000:loadbalancer/app/public-alb/abc123",
    load_balancer_type: "application",
    scheme: "internet-facing",
    state: "active",
    vpc_id: "vpc-0demo1234",
    availability_zones: [{ ZoneName: "us-east-1a" }, { ZoneName: "us-east-1b" }],
    security_groups: ["sg-0demo1234"],
    ip_address_type: "ipv4",
    private_ips: ["10.0.1.60", "10.0.1.61"],
    public_ips: ["54.210.10.60"],
  },
  {
    region: "ap-southeast-1",
    load_balancer_name: "internal-nlb",
    load_balancer_arn: "arn:aws:elasticloadbalancing:ap-southeast-1:000000000000:loadbalancer/net/internal-nlb/def456",
    load_balancer_type: "network",
    scheme: "internal",
    state: "active",
    vpc_id: "vpc-0demo5678",
    availability_zones: [{ ZoneName: "ap-southeast-1a" }],
    security_groups: [],
    ip_address_type: "ipv4",
    private_ips: ["10.0.2.60"],
    public_ips: [],
  },
];

// ---- Route 53 ----
export const route53Zones = [
  {
    hosted_zone: "alertservice.example.com.",
    main_url: "alertservice.example-internal.com",
    primary: {
      dns_name: "alertservice.example.com",
      alias_target: "alb-primary.us-east-1.elb.amazonaws.com",
      location: "NV",
      health_check_id: "hc-demo-1",
      health_status: "Healthy",
    },
    secondary: {
      dns_name: "alertservice.example.com",
      alias_target: "alb-secondary.ap-southeast-1.elb.amazonaws.com",
      location: "SG",
      health_check_id: "hc-demo-2",
      health_status: "Healthy",
    },
    active_target: "primary",
    active_alias_target: "alb-primary.us-east-1.elb.amazonaws.com",
    active_location: "NV",
    routing_reason: "Primary record is serving traffic",
  },
  {
    hosted_zone: "calcserver-ap.example.com.",
    main_url: "calcserver-ap.example-internal.com",
    primary: {
      dns_name: "calcserver-ap.example.com",
      alias_target: "alb-primary.ap-southeast-1.elb.amazonaws.com",
      location: "SG",
      health_check_id: "hc-demo-3",
      health_status: "Unhealthy",
    },
    secondary: {
      dns_name: "calcserver-ap.example.com",
      alias_target: "alb-secondary.us-east-1.elb.amazonaws.com",
      location: "NV",
      health_check_id: "hc-demo-4",
      health_status: "Healthy",
    },
    active_target: "secondary",
    active_alias_target: "alb-secondary.us-east-1.elb.amazonaws.com",
    active_location: "NV",
    routing_reason: "Primary record is unhealthy, so traffic has failed over to secondary",
  },
];

// ---- Components (Component DB) ----
export const components = [
  { region: "us-east-1", ip: "10.0.1.11", component_name: "web-app", platform: "Java", comp_path: "/apps/web-app", comp_version: "3.4.1", pipeline: "configured", watcher: "configured", release_date: "2026-08-01T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/web-app", category: "component", asset_custodian: "Platform Engineering" },
  { region: "us-east-1", ip: "10.0.1.12", component_name: "web-app", platform: "Java", comp_path: "/apps/web-app", comp_version: "3.4.1", pipeline: "configured", watcher: "configured", release_date: "2026-08-01T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/web-app", category: "component", asset_custodian: "Platform Engineering" },
  { region: "us-east-1", ip: "10.0.1.20", component_name: "api-service", platform: "Java", comp_path: "/apps/api-service", comp_version: "1.9.0", pipeline: "configured", watcher: "configured", release_date: "2026-07-20T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/api-service", category: "component", asset_custodian: "Platform Engineering" },
  { region: "us-east-1", ip: "10.0.1.20", component_name: "nightly-report", platform: "C++", comp_path: "/apps/nightly-report", comp_version: "1.0.4", pipeline: "unconfigured", watcher: "configured", release_date: "2026-06-11T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/nightly-report", category: "job", asset_custodian: "Platform Engineering" },
  { region: "ap-southeast-1", ip: "10.0.2.11", component_name: "market-feed", platform: "C++", comp_path: "/apps/market-feed", comp_version: "5.2.0", pipeline: "configured", watcher: "configured", release_date: "2026-08-10T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/market-feed", category: "component", asset_custodian: "Data Engineering" },
  { region: "ap-southeast-1", ip: "10.0.2.20", component_name: "batch-worker", platform: "Java", comp_path: "/apps/batch-worker", comp_version: "2.1.3", pipeline: "configured", watcher: "configured", release_date: "2026-08-05T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/batch-worker", category: "component", asset_custodian: "Data Engineering" },
  { region: "ap-southeast-1", ip: "10.0.2.20", component_name: "log-shipper", platform: "C++", comp_path: "/apps/log-shipper", comp_version: "0.9.1", pipeline: "unconfigured", watcher: "configured", release_date: "2026-05-02T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/log-shipper", category: "tool", asset_custodian: "Data Engineering" },
  { region: "ap-southeast-1", ip: "10.0.2.30", component_name: "ssh-jump", platform: "C++", comp_path: "/apps/ssh-jump", comp_version: "1.0.0", pipeline: "unconfigured", watcher: "unconfigured", release_date: "2025-12-01T00:00:00Z", code_repo_url: "https://gitlab.com/demo-org/ssh-jump", category: "tool", asset_custodian: "SRE Team" },
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
export const serverDetails = instances.map((inst, idx) => ({
  region: inst.region,
  ip: inst.private_ip,
  hostname: inst.instance_name,
  instance_id: inst.instance_id,
  os: idx % 2 === 0 ? "Amazon Linux 2023" : "Ubuntu 22.04",
  boot_time: now() - 3600 * (24 + idx),
  compliant_status: inst.instance_status === "stopped" ? "PENDING" : ["COMPLIANT", "COMPLIANT", "PARTIALLY_COMPLIANT"][idx % 3],
  watcher_status: idx === 5 ? "unconfigured" : "configured",
  watcher_version: idx === 5 ? null : "2.3.0",
  watcher_configured_component_count: idx === 5 ? 0 : 2,
  tool_component_count: 1,
  job_component_count: idx === 2 ? 1 : 0,
  component_category_count: 1,
  total_component_count: idx === 5 ? 1 : 2,
  tags: { Name: inst.instance_name, AssetCustodian: inst.asset_custodian },
  asset_custodian: inst.asset_custodian,
}));

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
    os_version: row.os.includes("Ubuntu") ? "22.04" : "2023",
    os_release: row.os,
    kernel_version: "6.5.0",
    kernel_release: "generic",
    architecture: "x86_64",
    platform: row.os.includes("Ubuntu") ? "Linux" : "Linux",
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
export const schedules = [
  {
    instance_id: instances[0].instance_id,
    region: instances[0].region,
    private_ip: instances[0].private_ip,
    instance_name: instances[0].instance_name,
    action: "stop",
    schedule_enabled: true,
    scheduled_time: new Date(Date.now() + 3600 * 1000 * 3).toISOString(),
  },
  {
    instance_id: instances[2].instance_id,
    region: instances[2].region,
    private_ip: instances[2].private_ip,
    instance_name: instances[2].instance_name,
    action: "start",
    schedule_enabled: true,
    scheduled_time: new Date(Date.now() + 3600 * 1000 * 8).toISOString(),
  },
];

export const instanceSchedules = [
  {
    instance_id: instances[0].instance_id,
    region: instances[0].region,
    private_ip: instances[0].private_ip,
    instance_name: instances[0].instance_name,
    action: "stop",
    schedule_enabled: true,
    tag_key: "stop_time",
    cron_expression: "0 22 * * 1-5",
    days: "Mon, Tue, Wed, Thu, Fri",
    scheduled_time: new Date(Date.now() + 3600 * 1000 * 3).toISOString(),
  },
  {
    instance_id: instances[0].instance_id,
    region: instances[0].region,
    private_ip: instances[0].private_ip,
    instance_name: instances[0].instance_name,
    action: "start",
    schedule_enabled: true,
    tag_key: "start_time",
    cron_expression: "0 6 * * 1-5",
    days: "Mon, Tue, Wed, Thu, Fri",
    scheduled_time: new Date(Date.now() + 3600 * 1000 * 15).toISOString(),
  },
  {
    instance_id: instances[5].instance_id,
    region: instances[5].region,
    private_ip: instances[5].private_ip,
    instance_name: instances[5].instance_name,
    action: "start",
    schedule_enabled: false,
    tag_key: "start_time",
    cron_expression: "0 8 * * 1-5",
    days: "Mon, Tue, Wed, Thu, Fri",
    scheduled_time: null,
  },
];

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

export function componentTreeMap() {
  const map = {};
  watchedComponents.forEach((c, idx) => {
    const key = `${c.ip}:${c.component_name}`;
    const upstream = idx > 0
      ? [{ component: `${watchedComponents[idx - 1].ip}:${watchedComponents[idx - 1].component_name}`, local_port: 8080, remote_port: 9090 }]
      : [];
    map[key] = { upstream, downstream: [], kind: "component" };
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
