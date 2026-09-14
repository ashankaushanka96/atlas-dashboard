-- Switch to database
USE COMPONENT_DB;

-- Create user that can connect from anywhere
CREATE USER IF NOT EXISTS 'app_user'@'%' IDENTIFIED BY 'changeme_password';
GRANT ALL PRIVILEGES ON COMPONENT_DB.* TO 'app_user'@'%';
FLUSH PRIVILEGES;

-- Components table
CREATE TABLE IF NOT EXISTS components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    region VARCHAR(255),
    ip VARCHAR(255),
    component_name VARCHAR(255),
    platform VARCHAR(255),
    comp_path VARCHAR(255),
    comp_version VARCHAR(255),
    pipeline BOOLEAN,
    last_run_time DATETIME,
    last_updated_time DATETIME,
    previous_tag VARCHAR(255),
    release_date DATETIME,
    code_repo_url VARCHAR(2048),
    config_repo_url VARCHAR(2048),
    script_repo_url VARCHAR(2048),
    description TEXT,
    watcher BOOLEAN,
    config_meta JSON,
    category VARCHAR(255)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_components_last_updated_time
    ON components (last_updated_time);

DELIMITER //

CREATE EVENT IF NOT EXISTS delete_old_components
ON SCHEDULE EVERY 1 DAY
STARTS TIMESTAMP(UTC_DATE() + INTERVAL 1 DAY, '01:00:00')
DO
BEGIN
    DELETE FROM components
    WHERE last_updated_time < UTC_TIMESTAMP() - INTERVAL 1 DAY;
END //

DELIMITER ;

-- Server details table
CREATE TABLE IF NOT EXISTS server_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ts BIGINT NOT NULL,
    region VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    fqdn VARCHAR(255),
    instance_id VARCHAR(255),
    primary_ip VARCHAR(255) NOT NULL,
    all_ips JSON NOT NULL,
    os_name VARCHAR(255),
    os_version VARCHAR(255),
    os_release VARCHAR(255),
    kernel_version VARCHAR(255),
    kernel_release VARCHAR(255),
    architecture VARCHAR(255),
    platform VARCHAR(255),
    python_version VARCHAR(255),
    current_username VARCHAR(255),
    home_directory VARCHAR(1024),
    watcher_directory VARCHAR(1024),
    apps_directory VARCHAR(1024),
    boot_time BIGINT,
    cpu_count_logical INT,
    cpu_count_physical INT,
    total_memory_mb INT,
    compliant_status VARCHAR(255),
    watcher_status VARCHAR(255) NOT NULL DEFAULT 'unconfigured',
    watcher_version VARCHAR(255),
    crons JSON NOT NULL,
    tags JSON,
    last_ingested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_server_details_region_primary_ip (region, primary_ip),
    INDEX idx_server_details_primary_ip (primary_ip),
    INDEX idx_server_details_last_ingested_at (last_ingested_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

DELIMITER //

CREATE EVENT IF NOT EXISTS delete_old_server_details
ON SCHEDULE EVERY 1 DAY
STARTS TIMESTAMP(UTC_DATE() + INTERVAL 1 DAY, '01:00:00')
DO
BEGIN
    DELETE FROM server_details
    WHERE last_ingested_at < UTC_TIMESTAMP() - INTERVAL 1 DAY;
END //

DELIMITER ;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(128) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'local',
    external_id VARCHAR(255) NULL UNIQUE,
    display_name VARCHAR(255) NULL,
    role_id INT NOT NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci;

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL,
    permissions JSON NOT NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_0900_ai_ci;

-- Seed roles
INSERT INTO roles (name, permissions) VALUES
  (
    'admin',
    JSON_OBJECT(
      'view_components',     true,
      'add_components',      true,
      'view_component_tree', true,
      'view_schedules',      true,
      'add_schedules',       true,
      'run_lambda',          true,
      'view_server_details', true,
      'view_routes',         true,
      'view_server_control', true,
      'start_stop_servers',  true,
      'restart_watcher',     true,
      'restart_component',   true,
      'configure_watcher',   true,
      'view_component_logs',     true,
      'download_component_logs', true,
      'user_management',     true
    )
  ),
  (
    'feedops',
    JSON_OBJECT(
      'view_components',     true,
      'add_components',      true,
      'view_component_tree', true,
      'view_schedules',      true,
      'add_schedules',       true,
      'run_lambda',          true,
      'view_server_details', true,
      'view_routes',         true,
      'view_server_control', true,
      'start_stop_servers',  true,
      'restart_watcher',     true,
      'restart_component',   true,
      'configure_watcher',   true,
      'view_component_logs',     true,
      'download_component_logs', true,
      'user_management',     false
    )
  ),
  (
    'developer',
    JSON_OBJECT(
      'view_components',     true,
      'add_components',      false,
      'view_component_tree', true,
      'view_schedules',      true,
      'add_schedules',       false,
      'run_lambda',          false,
      'view_server_details', true,
      'view_routes',         true,
      'view_server_control', true,
      'start_stop_servers',  true,
      'restart_watcher',     false,
      'restart_component',   false,
      'configure_watcher',   false,
      'view_component_logs',     true,
      'download_component_logs', false,
      'user_management',     false
    )
  ),
  (
    'viewer',
    JSON_OBJECT(
      'view_components',     true,
      'add_components',      false,
      'view_component_tree', true,
      'view_schedules',      true,
      'add_schedules',       false,
      'run_lambda',          false,
      'view_server_details', true,
      'view_routes',         true,
      'view_server_control', true,
      'start_stop_servers',  false,
      'restart_watcher',     false,
      'restart_component',   false,
      'configure_watcher',   false,
      'view_component_logs',     false,
      'download_component_logs', false,
      'user_management',     false
    )
  );

-- Per-user table column preferences (visibility + order)
CREATE TABLE IF NOT EXISTS user_table_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    table_key VARCHAR(100) NOT NULL,
    columns JSON NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_table_preferences (user_id, table_key),
    CONSTRAINT fk_user_table_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
