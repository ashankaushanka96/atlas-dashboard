// Custom axios adapter that serves canned data instead of hitting a real
// backend. Wired in only when demo mode is on (see services/auth.js), so the
// production/docker build is completely unaffected.
import * as fx from "./demoFixtures.js";

function ok(data, config) {
  return Promise.resolve({ data, status: 200, statusText: "OK", headers: {}, config });
}

function splitUrl(url) {
  const [path, queryString] = String(url).split("?");
  return { path, query: new URLSearchParams(queryString || "") };
}

function parseBody(data) {
  if (!data) return {};
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

const genericMetricUnit = (endpoint) => {
  if (endpoint.includes("percent")) return "%";
  if (endpoint.includes("memory")) return "MB";
  if (endpoint.includes("cpu")) return "%";
  if (endpoint.includes("size")) return "MB";
  return "";
};

export default function demoAdapter(config) {
  const method = (config.method || "get").toLowerCase();
  const { path, query } = splitUrl(config.url || "");
  const params = { ...Object.fromEntries(query.entries()), ...(config.params || {}) };
  const body = parseBody(config.data);
  const respond = (data) => ok(data, config);

  // ---- auth ----
  if (path === "/auth/users/me") {
    return respond(fx.DEMO_USER);
  }
  if (path === "/auth/users/roles") {
    return respond({
      users: fx.managedUsers,
      available_roles: Object.keys(fx.ROLE_PERMISSIONS),
      role_permissions: Object.entries(fx.ROLE_PERMISSIONS).map(([name, permissions]) => ({
        name,
        permissions,
      })),
    });
  }
  if (path === "/auth/user/role" && method === "patch") {
    const user = fx.managedUsers.find((u) => u.username === body.username);
    if (user) user.role_name = body.new_role;
    return respond({
      user_details: {
        id: user?.id || 0,
        username: body.username,
        auth_provider: "local",
        external_id: null,
        display_name: body.username,
        role: { name: body.new_role, permissions: fx.ROLE_PERMISSIONS[body.new_role] || {} },
      },
      message: `Role updated for ${body.username} (demo).`,
    });
  }
  if (path === "/auth/user/local" && method === "post") {
    const newUser = { id: fx.managedUsers.length + 1, username: body.username, role_name: body.role || "viewer" };
    fx.managedUsers.push(newUser);
    return respond({
      user_details: {
        id: newUser.id,
        username: newUser.username,
        auth_provider: "local",
        external_id: null,
        display_name: newUser.username,
        role: { name: newUser.role_name, permissions: fx.ROLE_PERMISSIONS[newUser.role_name] || {} },
      },
      message: `Local user created for ${newUser.username} (demo).`,
    });
  }
  if (path.startsWith("/auth/user/") && method === "delete") {
    const username = decodeURIComponent(path.split("/").pop());
    const idx = fx.managedUsers.findIndex((u) => u.username === username);
    if (idx >= 0) fx.managedUsers.splice(idx, 1);
    return respond({ username, message: `User ${username} removed (demo).` });
  }
  if (path === "/auth/refresh/token" || path === "/auth/access/token" || path === "/auth/register" || path === "/auth/entra/access/token") {
    return respond({ refresh_token: "demo-refresh-token", access_token: "demo-access-token", token_type: "bearer" });
  }

  // ---- table preferences ----
  if (path.startsWith("/table-preferences/")) {
    if (method === "put") {
      return respond({ status_code: 200, columns: body.columns || [] });
    }
    return respond({ status_code: 200, columns: null });
  }

  // ---- component / region / platform lookups ----
  if (path === "/schedules/aws/fetch-available-regions") {
    return respond({ status_code: 200, regions: fx.REGIONS });
  }
  if (path === "/schedules/aws/fetch-ips") {
    return respond({ status_code: 200, ips: fx.awsIps });
  }
  if (path === "/components/fetch-all-regions") {
    return respond({ status_code: 200, regions: fx.ALL_REGIONS });
  }
  if (path === "/components/fetch-platforms") {
    return respond({ status_code: 200, platforms: fx.PLATFORMS });
  }
  if (path === "/components/fetch-components-by-ip") {
    const ip = params.ip;
    const matches = fx.components.filter((c) => c.ip === ip);
    return respond({ status_code: 200, components: matches });
  }
  if (path === "/components/fetch-component-detail") {
    return respond({
      status_code: 200,
      component: fx.componentDetail(params.region, params.ip, params.component_name),
    });
  }
  if (path === "/components/delete-component" && method === "delete") {
    return respond({ status_code: 200, message: "Component deleted (demo)." });
  }
  if (path === "/components/fetch-components") {
    return respond({ status_code: 200, components: fx.components });
  }

  // ---- component detail / max-up-days (watcher status + metrics modal) ----
  if (path === "/component/detail") {
    const detail = fx.componentDetail(params.region, params.ip, params.component || params.component_name);
    return respond({
      status_code: 200,
      component: {
        ...detail,
        listen: 8080,
        state: "up",
        needs_to_run: true,
        port_status: "listening",
        uptime_seconds: 43200,
        config_meta: { tag: detail.component_name, port: 8080, max_up_days: 14, need_to_up: true, need_to_send_mail: false },
      },
    });
  }
  if (path === "/component/max-up-days") {
    return respond({ status_code: 200, ip: params.ip, component: params.component, max_up_days: 14 });
  }
  if (path === "/component-tree/map") {
    return respond(fx.componentTreeMap());
  }

  // ---- AWS resource summaries ----
  if (path === "/ec2-details/fetch-instance-summary") {
    return respond({ status_code: 200, instances: fx.instances });
  }
  if (path === "/ec2-details/fetch-instance-details") {
    return respond({ status_code: 200, instance_details: fx.instanceDetails(params.instance_id) });
  }
  if (path === "/ecs/fetch-clusters-summary") {
    return respond({ status_code: 200, clusters: fx.ecsClusters });
  }
  if (path === "/ecs/fetch-services-summary") {
    return respond({ status_code: 200, services: fx.ecsServices });
  }
  if (path === "/ecs/fetch-cluster-details") {
    const c = fx.ecsClusters.find((x) => x.cluster_name === params.cluster_name) || fx.ecsClusters[0];
    return respond({
      status_code: 200,
      cluster_details: {
        ...c,
        registered_container_instances_count: 2,
        capacity_providers: ["FARGATE"],
        default_capacity_provider_strategy: [{ capacityProvider: "FARGATE", weight: 1 }],
        tags: [{ Key: "Environment", Value: "demo" }],
      },
    });
  }
  if (path === "/ecs/fetch-service-details") {
    const s = fx.ecsServices.find((x) => x.service_name === params.service_name) || fx.ecsServices[0];
    return respond({
      status_code: 200,
      service_details: {
        ...s,
        task_definition: `${s.service_name}:12`,
        deployment_configuration: { maximumPercent: 200, minimumHealthyPercent: 100 },
        network_configuration: { awsvpcConfiguration: { subnets: ["subnet-0demo1234"], assignPublicIp: "DISABLED" } },
        load_balancers: [],
        tags: [{ Key: "Environment", Value: "demo" }],
      },
    });
  }
  if (path === "/eks/fetch-clusters-summary") {
    return respond({ status_code: 200, clusters: fx.eksClusters });
  }
  if (path === "/eks/fetch-cluster-details") {
    const c = fx.eksClusters.find((x) => x.cluster_name === params.cluster_name) || fx.eksClusters[0];
    return respond({
      status_code: 200,
      cluster_details: {
        ...c,
        role_arn: "arn:aws:iam::000000000000:role/eks-demo-role",
        resources_vpc_config: { subnetIds: ["subnet-0demo1234"], endpointPublicAccess: true },
        logging: { clusterLogging: [{ types: ["api"], enabled: true }] },
        identity: { oidc: { issuer: "https://oidc.eks.us-east-1.amazonaws.com/id/DEMO" } },
        tags: [{ Key: "Environment", Value: "demo" }],
        node_groups: [{ nodegroupName: "default", status: "ACTIVE", desiredSize: 3 }],
      },
    });
  }
  if (path === "/lambda/fetch-functions-summary") {
    return respond({ status_code: 200, functions: fx.lambdaFunctions });
  }
  if (path === "/lambda/fetch-function-details") {
    const f = fx.lambdaFunctions.find((x) => x.function_name === params.function_name) || fx.lambdaFunctions[0];
    return respond({
      status_code: 200,
      function_details: {
        ...f,
        role: "arn:aws:iam::000000000000:role/lambda-demo-role",
        handler: "index.handler",
        version: "$LATEST",
        environment_variables: { STAGE: "demo" },
        tags: [{ Key: "Environment", Value: "demo" }],
        vpc_config: null,
        layers: [],
      },
    });
  }
  if (path === "/redis/fetch-clusters-summary") {
    return respond({ status_code: 200, clusters: fx.redisClusters });
  }
  if (path === "/redis/fetch-cluster-details") {
    const c = fx.redisClusters.find((x) => x.replication_group_id === params.replication_group_id) || fx.redisClusters[0];
    return respond({
      status_code: 200,
      cluster_details: {
        ...c,
        cache_nodes: [{ CacheNodeId: "0001", CacheNodeStatus: "available" }],
        cache_parameter_group: { CacheParameterGroupName: "default.redis7" },
        cache_subnet_group: { CacheSubnetGroupName: "demo-subnet-group" },
        security_groups: [{ SecurityGroupId: "sg-0demo1234" }],
        at_rest_encryption_enabled: true,
        transit_encryption_enabled: true,
        tags: [{ Key: "Environment", Value: "demo" }],
      },
    });
  }
  if (path === "/msk/fetch-clusters-summary") {
    return respond({ status_code: 200, clusters: fx.mskClusters });
  }
  if (path === "/msk/fetch-cluster-details") {
    const c = fx.mskClusters.find((x) => x.cluster_name === params.cluster_name) || fx.mskClusters[0];
    return respond({
      status_code: 200,
      cluster_details: {
        ...c,
        enhanced_monitoring: "DEFAULT",
        broker_node_group_info: { InstanceType: "kafka.m5.large" },
        client_authentication: { Sasl: { Iam: { Enabled: false } } },
        encryption_info: { EncryptionAtRest: { DataVolumeKMSKeyId: "alias/demo" } },
        connectivity_info: { PublicAccess: { Type: "DISABLED" } },
        logging_info: { BrokerLogs: { CloudWatchLogs: { Enabled: true } } },
        tags: { Environment: "demo" },
        configuration_info: null,
      },
    });
  }
  if (path === "/loadbalancer/fetch-load-balancers-summary") {
    return respond({ status_code: 200, load_balancers: fx.loadBalancers });
  }
  if (path === "/loadbalancer/fetch-load-balancer-details") {
    const lb = fx.loadBalancers.find((x) => x.load_balancer_name === params.load_balancer_name) || fx.loadBalancers[0];
    return respond({
      status_code: 200,
      load_balancer_details: {
        ...lb,
        dns_name: `${lb.load_balancer_name}-demo.${lb.region}.elb.amazonaws.com`,
        listeners: [
          {
            listener_arn: `${lb.load_balancer_arn}/listener/1`,
            port: 443,
            protocol: "HTTPS",
            ssl_policy: "ELBSecurityPolicy-TLS13-1-2-2021-06",
            certificates: [{ CertificateArn: "arn:aws:acm:us-east-1:000000000000:certificate/demo" }],
            rules: [],
          },
        ],
        target_groups: [
          {
            target_group_arn: `${lb.load_balancer_arn}/targetgroup/demo`,
            target_group_name: `${lb.load_balancer_name}-tg`,
            protocol: "HTTPS",
            port: 443,
            target_type: "instance",
            health_check: { Protocol: "HTTPS", Path: "/health" },
            targets: fx.instances.slice(0, 2).map((i) => ({
              id: i.instance_id,
              port: 443,
              availability_zone: `${i.region}a`,
              health_state: "healthy",
              health_reason: null,
              health_description: null,
              private_ip: i.private_ip,
              public_ip: i.public_ip,
            })),
          },
        ],
        instances: [],
        tags: [{ Key: "Environment", Value: "demo" }],
        attributes: {},
      },
    });
  }

  // ---- Route 53 ----
  if (path === "/route53/fetch-zone-names") {
    return respond(fx.route53Zones.map((z) => z.hosted_zone));
  }
  if (path === "/route53/fetch-zones") {
    return respond({ status_code: 200, route53_details: fx.route53Zones });
  }
  if (path === "/route53/fetch-zone-detail") {
    const zoneName = params.zone_name || params.hosted_zone;
    const zone = fx.route53Zones.find((z) => z.hosted_zone === zoneName) || fx.route53Zones[0];
    return respond({ status_code: 200, zone_detail: zone });
  }

  // ---- Server details / start-stop ----
  if (path === "/server-details/fetch-server-details") {
    return respond({ status_code: 200, server_details: fx.serverDetails });
  }
  if (path === "/server-details/fetch-server-detail") {
    return respond({ status_code: 200, server_detail: fx.serverDetail(params.region, params.ip) });
  }
  if (path === "/server-details/fetch-asset-custodians") {
    return respond({ status_code: 200, asset_custodians: ["Platform Engineering", "Data Engineering", "SRE Team"] });
  }
  if (path === "/server-details/fetch-inspector-findings") {
    return respond({ status_code: 200, inspector_findings: [] });
  }
  if (path === "/server-start-stop/fetch-start-stop-instances") {
    return respond({ status_code: 200, instances: fx.instances });
  }
  if (path === "/server-start-stop/start-stop-instance" && method === "post") {
    const target = fx.findInstance(body.instance_id);
    if (target) target.instance_status = body.action === "start" ? "running" : "stopped";
    return respond({ status_code: 200, message: `Instance ${body.action}ed (demo).` });
  }

  // ---- Schedules ----
  if (path === "/schedules/fetch-schedules") {
    return respond({ status_code: 200, schedules: fx.schedules });
  }
  if (path === "/schedules/fetch-instance-schedules") {
    return respond({ status_code: 200, schedules: fx.instanceSchedules });
  }
  if (path === "/schedules/fetch-existing-instance-tags") {
    return respond({
      status_code: 200,
      tags: [
        { key: "start_time", value: "0 6 * * 1-5" },
        { key: "stop_time", value: "0 22 * * 1-5" },
      ],
      schedule_enabled: "true",
    });
  }
  if (path === "/schedules/update-instance-tags" && method === "post") {
    return respond({ status_code: 200, message: "Instance tags updated (demo)." });
  }
  if (path === "/schedules/run-lambda" && method === "post") {
    return respond({ status_code: 200, message: "Lambda invoked successfully (demo)." });
  }

  // ---- Watcher control ----
  if (path === "/watcher-control/component/status") {
    return respond({ status_code: 200, status: "running", running: true, message: "Component is running (demo)." });
  }
  if (path.startsWith("/watcher-control/component/logs/grep")) {
    return respond({ status_code: 200, lines: ["[demo] 2026-09-14 10:00:01 INFO sample log line matching your query"], next_offset: null, total_size: 128, eof: true, scan_truncated: false });
  }
  if (path === "/watcher-control/component/logs/tail" || path === "/watcher-control/component/logs/page") {
    return respond({
      status_code: 200,
      lines: [
        "[demo] 2026-09-14 10:00:00 INFO Component started",
        "[demo] 2026-09-14 10:00:05 INFO Listening on port 8080",
        "[demo] 2026-09-14 10:01:00 INFO Heartbeat OK",
      ],
      next_offset: 256,
      total_size: 256,
      eof: true,
      scan_truncated: false,
    });
  }
  if (path === "/watcher-control/component/logs/download" || path.startsWith("/watcher-control/component/logs/grep/download")) {
    return respond("[demo] sample log file content\n");
  }
  if (path === "/watcher-control/component/logs") {
    return respond({
      status_code: 200,
      files: [
        { name: "app.log", size: 20480, modified: Date.now() / 1000 },
        { name: "app.log.1", size: 20480, modified: Date.now() / 1000 - 86400 },
      ],
    });
  }
  if (path.startsWith("/watcher-control/component/") && method === "post") {
    return respond({ status_code: 200, status: "success", running: true, message: "Component action completed (demo)." });
  }
  if (path === "/watcher-control/fetch-components") {
    return respond({
      status_code: 200,
      components: fx.components
        .filter((c) => c.watcher === "configured")
        .map((c) => ({
          section_id: c.component_name,
          tag: c.component_name,
          name: c.component_name,
          port: 8080,
          startTime: "06:00",
          endTime: "22:00",
          runningDates: "1,2,3,4,5",
          maxUpDays: "14",
          needToUp: "true",
          needToSendMail: "false",
          runScriptPath: c.comp_path,
          runScript: "start.sh",
          logDirectory: `${c.comp_path}/logs`,
        })),
      has_backup: false,
    });
  }
  if (path === "/watcher-control/status") {
    return respond({ status_code: 200, status: "running", running: true, message: "Watcher is running (demo)." });
  }
  if (path === "/watcher-control/rollback" && method === "post") {
    return respond({ status_code: 200, restored: [], removed: [], changed: [], restarted: true, message: "Rollback complete (demo)." });
  }
  if (path === "/watcher-control/configure" && method === "post") {
    return respond({
      status_code: 200,
      added: (body.add_components || []).map((c) => c.section_id),
      removed: body.remove_component_ids || [],
      restarted: true,
      message: "Watcher configured (demo).",
    });
  }
  if (path.startsWith("/watcher-control/") && method === "post") {
    return respond({ status_code: 200, status: "success", running: true, message: "Watcher action completed (demo)." });
  }

  // ---- Datadog metrics (generic handler for every fetch-*-metric endpoint) ----
  if (path.startsWith("/datadog-metrics/")) {
    const isLastValue = /status|uptime|up-time/.test(path);
    const base = {
      status_code: 200,
      host: params.host,
      component: params.component || null,
      period: Number(params.period) || 3600,
      from_ts: Date.now() - 3600000,
      to_ts: Date.now(),
      metric: path.split("/").pop(),
      query: `avg:demo.metric{host:${params.host}}`,
    };
    if (isLastValue) {
      return respond({ ...base, response_type: "last_value", value: 1, timestamp_ms: Date.now() });
    }
    return respond({
      ...base,
      response_type: "series",
      series: [
        {
          metric: base.metric,
          expression: base.query,
          scope: `host:${params.host}`,
          tag_set: [],
          display_name: base.metric,
          pointlist: fx.buildSeries(
            path.includes("percent")
              ? 0.4 // some percent metrics are displayed as a 0-1 fraction and scaled by the chart
              : path.includes("cpu")
              ? 35
              : path.includes("memory")
              ? 512 * 1024 * 1024 // bytes, so byte-formatting charts show a sane "512 MB" instead of "512 B"
              : 512,
            path.includes("percent") ? 0.1 : 12
          ),
          unit: [{ name: genericMetricUnit(path) }],
        },
      ],
    });
  }

  // ---- Fallback: never throw, just return an empty-but-valid shape ----
  console.info(`[demo mode] no mock for ${method.toUpperCase()} ${path}, returning empty response`);
  if (method === "get") {
    return respond({ status_code: 200 });
  }
  return respond({ status_code: 200, message: "OK (demo)." });
}
