USE COMPONENT_DB;

-- Split "Component Actions" into independent permissions, all previously
-- bundled under restart_watcher:
--   restart_watcher          - unchanged: start/stop/restart the watcher
--                               process itself (host-level).
--   restart_component        - NEW: start/stop/restart an individual
--                               component the watcher manages, and read its
--                               running/stopped status. A user can hold this
--                               without restart_watcher, or vice versa.
--   view_component_logs      - NEW: list/tail/page/grep/live-tail a
--                               component's log files.
--   download_component_logs  - NEW: download the raw log file. Separate from
--                               view_component_logs since log files can be
--                               large and may contain sensitive output, so
--                               granting read access shouldn't imply download
--                               access.
--
-- Defaults for the three new permissions carry over restart_watcher's prior
-- matrix for restart_component (nobody's access to component start/stop/
-- restart changes), and add: admin/feedops get log view + download,
-- developer gets log view only (useful for debugging, no download), viewer
-- gets neither.
UPDATE roles
SET permissions = JSON_SET(
    permissions,
    '$.restart_component', true,
    '$.view_component_logs', true,
    '$.download_component_logs', true
)
WHERE name IN ('admin', 'feedops');

UPDATE roles
SET permissions = JSON_SET(
    permissions,
    '$.restart_component', false,
    '$.view_component_logs', true,
    '$.download_component_logs', false
)
WHERE name = 'developer';

UPDATE roles
SET permissions = JSON_SET(
    permissions,
    '$.restart_component', false,
    '$.view_component_logs', false,
    '$.download_component_logs', false
)
WHERE name NOT IN ('admin', 'feedops', 'developer');
