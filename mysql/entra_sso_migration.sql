USE COMPONENT_DB;

ALTER TABLE users
    MODIFY username VARCHAR(255) NOT NULL,
    MODIFY hashed_password VARCHAR(128) NULL,
    ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'local' AFTER created_at,
    ADD COLUMN external_id VARCHAR(255) NULL UNIQUE AFTER auth_provider,
    ADD COLUMN display_name VARCHAR(255) NULL AFTER external_id;
