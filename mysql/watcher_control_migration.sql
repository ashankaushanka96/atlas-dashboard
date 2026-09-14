USE COMPONENT_DB;

-- Watcher version, pushed by the watcher alongside its existing watcher_status.
ALTER TABLE server_details
    ADD COLUMN watcher_version VARCHAR(255) AFTER watcher_status;

-- New permissions for the "Restart Watcher" / "Configure Watcher" actions in Host Details.
-- Defaults: admin/feedops get both, developer/viewer get neither (mirrors start_stop_servers).
UPDATE roles
SET permissions = JSON_SET(permissions, '$.restart_watcher', true, '$.configure_watcher', true)
WHERE name IN ('admin', 'feedops');

UPDATE roles
SET permissions = JSON_SET(permissions, '$.restart_watcher', false, '$.configure_watcher', false)
WHERE name NOT IN ('admin', 'feedops');
