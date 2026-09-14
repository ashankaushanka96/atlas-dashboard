# database.py

import mysql.connector
from mysql.connector import pooling
import sys
import json
from threading import Lock
from loguru import logger
from models.component_section_models import Component
from typing import List, Optional, Tuple, Dict
from models.authentication_models import (
    User,
    Role,
)


class Database:
    _shared_pools = {}
    _pool_lock = Lock()

    def __init__(self, db_config):
        self.db_config = db_config
        if not self.db_config:
            logger.error("Database configuration not found in config file.")
            sys.exit("Database configuration not found")

        self.pool_size = self._resolve_pool_size(self.db_config.get("pool_size"))
        self.pool_name = self._resolve_pool_name(
            self.db_config.get("pool_name"),
            self.db_config.get("database"),
        )
        self.pool_config = self._build_pool_config(self.db_config)
        self.pool_key = self._build_pool_key()
        self.connection_pool = self._get_or_create_connection_pool()

    def _resolve_pool_size(self, value):
        try:
            pool_size = int(value) if value is not None else 10
        except (TypeError, ValueError):
            pool_size = 10
        return max(1, pool_size)

    def _resolve_pool_name(self, configured_name, database_name):
        base_name = str(configured_name or f"{database_name or 'app'}_pool").strip()
        sanitized = "".join(char if char.isalnum() or char == "_" else "_" for char in base_name)
        return sanitized[: pooling.CNX_POOL_MAXNAMESIZE] or "app_pool"

    def _build_pool_config(self, db_config):
        pool_config = dict(db_config)
        pool_config.pop("pool_name", None)
        pool_config.pop("pool_size", None)
        return pool_config

    def _build_pool_key(self):
        serialized_config = json.dumps(self.pool_config, sort_keys=True, default=str)
        return f"{self.pool_name}:{self.pool_size}:{serialized_config}"

    def _create_connection_pool(self):
        try:
            pool = pooling.MySQLConnectionPool(
                pool_name=self.pool_name,
                pool_size=self.pool_size,
                pool_reset_session=True,
                **self.pool_config,
            )
            logger.info(
                "MySQL connection pool initialized. pool_name={} pool_size={}",
                self.pool_name,
                self.pool_size,
            )
            return pool
        except mysql.connector.Error:
            logger.exception("MySQL connection pool initialization error")
            raise

    def _get_or_create_connection_pool(self):
        existing_pool = self._shared_pools.get(self.pool_key)
        if existing_pool is not None:
            logger.debug("Reusing shared MySQL connection pool {}.", self.pool_name)
            return existing_pool

        with self._pool_lock:
            existing_pool = self._shared_pools.get(self.pool_key)
            if existing_pool is not None:
                logger.debug("Reusing shared MySQL connection pool {}.", self.pool_name)
                return existing_pool

            pool = self._create_connection_pool()
            self._shared_pools[self.pool_key] = pool
            return pool

    def get_connection(self):
        try:
            connection = self.connection_pool.get_connection()
            logger.debug("Database connection acquired from pool {}.", self.pool_name)
            return connection
        except mysql.connector.Error:
            logger.exception("Database connection acquisition error")
            raise

    ###############################################################################################
    #                                  COMPONENTS SECTION FUNCTIONS                               #
    ###############################################################################################
    def fetch_all_components(self):
        connection = self.get_connection()
        cursor = connection.cursor()

        try:
            query = "SELECT region, ip, component_name, platform, comp_path, comp_version, pipeline, last_run_time, last_updated_time, previous_tag, release_date, code_repo_url, config_repo_url, script_repo_url, description, watcher FROM components ORDER BY region, ip, component_name"
            cursor.execute(query)
            results = cursor.fetchall()
            logger.info("Fetched {} components.", len(results))
            return results
        except Exception as e:
            logger.exception("Error fetching components: {}", e)
            raise
        finally:
            cursor.close()
            connection.close()

    def fetch_component_summaries(self):
        connection = self.get_connection()
        cursor = connection.cursor()

        try:
            query = """
                SELECT
                    c.region, c.ip, c.component_name, c.platform, c.comp_path, c.comp_version,
                    c.pipeline, c.watcher, c.release_date, c.code_repo_url, c.category, c.config_meta,
                    JSON_UNQUOTE(JSON_EXTRACT(sd.tags, '$.AssetCustodian')) AS asset_custodian
                FROM components c
                LEFT JOIN server_details sd
                    ON sd.region = c.region AND sd.primary_ip = c.ip
                ORDER BY c.region, c.ip, c.component_name
            """
            cursor.execute(query)
            results = cursor.fetchall()
            logger.info("Fetched {} component summaries.", len(results))
            return results
        except Exception as e:
            logger.exception("Error fetching component summaries: {}", e)
            raise
        finally:
            cursor.close()
            connection.close()

    def fetch_component_detail(
        self,
        region: str,
        ip: str,
        component_name: str,
        platform: str,
        comp_path: str,
    ):
        connection = self.get_connection()
        cursor = connection.cursor()

        try:
            query = """
                SELECT region, ip, component_name, platform, comp_path, comp_version, pipeline,
                       last_run_time, last_updated_time, previous_tag, release_date,
                       code_repo_url, config_repo_url, script_repo_url, description, watcher,
                       config_meta, category
                FROM components
                WHERE region = %s
                  AND ip = %s
                  AND component_name = %s
                  AND platform = %s
                  AND comp_path = %s
                LIMIT 1
            """
            cursor.execute(query, (region, ip, component_name, platform, comp_path))
            result = cursor.fetchone()
            logger.info(
                "Fetched component detail for region={} ip={} component={}: {}",
                region,
                ip,
                component_name,
                bool(result),
            )
            return result
        except Exception as e:
            logger.exception("Error fetching component detail: {}", e)
            raise
        finally:
            cursor.close()
            connection.close()

    def fetch_components_by_ip(self, ip: str, region: str):
        connection = self.get_connection()
        cursor = connection.cursor()

        try:
            query = """
                SELECT
                    region,
                    ip,
                    component_name,
                    platform,
                    comp_path,
                    pipeline,
                    watcher,
                    config_meta
                FROM components
                WHERE ip = %s AND region = %s
                ORDER BY region, ip, component_name
            """
            cursor.execute(query, (ip, region))
            results = cursor.fetchall()
            logger.info("Fetched {} components.", len(results))
            return results
        except Exception as e:
            logger.exception("Error fetching components: {}", e)
            raise
        finally:
            cursor.close()
            connection.close()

    def add_component(self, component: Component):
        connection = self.get_connection()
        cursor = connection.cursor()
        try:
            query = """
                INSERT INTO components (region, ip, component_name, platform, comp_path)
                VALUES (%s, %s, %s, %s, %s)
            """
            values = (
                component.region,
                component.ip,
                component.component_name,
                component.platform,
                component.comp_path,
            )
            cursor.execute(query, values)
            connection.commit()
            logger.info(f"Component added successfully: {component.component_name}")
        except Exception as e:
            connection.rollback()
            logger.exception(f"Error adding component {component.component_name} : {e}")
            raise
        finally:
            cursor.close()
            connection.close()

    def delete_component(self, component: Component):
        connection = self.get_connection()
        cursor = connection.cursor()
        try:
            query = """DELETE FROM components WHERE region = %s AND ip = %s AND component_name = %s AND platform = %s AND comp_path = %s"""
            values = (
                component.region,
                component.ip,
                component.component_name,
                component.platform,
                component.comp_path,
            )
            cursor.execute(query, values)
            connection.commit()
            logger.info("Component deleted successfully: {}", component.component_name)
        except Exception as e:
            connection.rollback()
            logger.exception(
                "Error deleting component {}: {}", component.component_name, e
            )
            raise
        finally:
            cursor.close()
            connection.close()

    def sync_components(self, components: List[Component]) -> dict:
        conn = self.get_connection()
        cur = conn.cursor()
        added = updated = deleted = 0

        try:
            # Group incoming by server
            by_server: dict[Tuple[str,str], List[Component]] = {}
            for c in components:
                by_server.setdefault((c.region, c.ip), []).append(c)

            for (region, ip), comps in by_server.items():
                # 1) load existing
                cur.execute("""
                    SELECT component_name, platform, comp_path
                      FROM components
                     WHERE region=%s AND ip=%s
                """, (region, ip))
                existing_rows = cur.fetchall()
                existing = {
                    row[0]: {"platform": row[1], "comp_path": row[2]}
                    for row in existing_rows
                }

                # 2) map incoming
                incoming = {
                    c.component_name: {"platform": c.platform, "comp_path": c.comp_path}
                    for c in comps
                }

                # 3) INSERT new
                for name, props in incoming.items():
                    if name not in existing:
                        cur.execute("""
                            INSERT INTO components
                                (region, ip, component_name, platform, comp_path)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (region, ip, name, props["platform"], props["comp_path"]))
                        added += 1

                # 4) UPDATE changed
                for name, props in incoming.items():
                    if name in existing:
                        if (props["comp_path"] != existing[name]["comp_path"]
                            or props["platform"] != existing[name]["platform"]):
                            cur.execute("""
                                UPDATE components
                                   SET platform=%s, comp_path=%s
                                 WHERE region=%s AND ip=%s AND component_name=%s
                            """, (
                                props["platform"], props["comp_path"],
                                region, ip, name
                            ))
                            updated += 1

                # 5) DELETE omitted
                for name in existing:
                    if name not in incoming:
                        cur.execute("""
                            DELETE FROM components
                              WHERE region=%s AND ip=%s AND component_name=%s
                        """, (region, ip, name))
                        deleted += 1

            conn.commit()
            return {"added": added, "updated": updated, "deleted": deleted}

        except Exception:
            conn.rollback()
            logger.exception("Error during sync_components")
            raise
        finally:
            cur.close()
            conn.close()
            
    ###############################################################################################
    #                                  EC2 DETAILS SECTION FUNCTIONS                              #
    ###############################################################################################
    def fetch_component_names(self, ip: str):
        connection = self.get_connection()
        cursor = connection.cursor()
        try:
            query = ("SELECT component_name FROM components WHERE ip = %s ORDER BY component_name")
            cursor.execute(query, (ip,))
            results = cursor.fetchall()
            component_names = [row[0] for row in results]
            logger.info("Found {} component names for IP: {}", len(component_names), ip)
            return component_names
        except Exception as e:
            logger.exception("Error fetching component names for IP {}: {}", ip, e)
            raise
        finally:
            cursor.close()
            connection.close()

    ###############################################################################################
    #                              SERVER DETAILS SECTION FUNCTIONS                                #
    ###############################################################################################
    def fetch_server_details(self):
        connection = self.get_connection()
        cursor = connection.cursor()
        try:
            query = """
                SELECT
                    sd.region,
                    sd.primary_ip,
                    sd.hostname,
                    sd.instance_id,
                    sd.os_name,
                    sd.boot_time,
                    sd.compliant_status,
                    sd.watcher_status,
                    sd.watcher_version,
                    COALESCE(component_counts.watcher_configured_component_count, 0) AS watcher_configured_component_count,
                    COALESCE(component_counts.tool_component_count, 0) AS tool_component_count,
                    COALESCE(component_counts.job_component_count, 0) AS job_component_count,
                    COALESCE(component_counts.component_category_count, 0) AS component_category_count,
                    COALESCE(component_counts.total_component_count, 0) AS total_component_count,
                    sd.tags
                FROM server_details sd
                LEFT JOIN (
                    SELECT
                        region,
                        ip,
                        SUM(CASE WHEN COALESCE(watcher, 0) <> 0 THEN 1 ELSE 0 END) AS watcher_configured_component_count,
                        SUM(CASE WHEN LOWER(COALESCE(category, '')) = 'tool' THEN 1 ELSE 0 END) AS tool_component_count,
                        SUM(CASE WHEN LOWER(COALESCE(category, '')) = 'job' THEN 1 ELSE 0 END) AS job_component_count,
                        SUM(CASE WHEN LOWER(COALESCE(category, '')) = 'component' THEN 1 ELSE 0 END) AS component_category_count,
                        COUNT(*) AS total_component_count
                    FROM components
                    GROUP BY region, ip
                ) component_counts
                    ON component_counts.region = sd.region
                   AND component_counts.ip = sd.primary_ip
                ORDER BY sd.region, sd.primary_ip
            """
            cursor.execute(query)
            results = cursor.fetchall()
            logger.info("Fetched {} server detail rows.", len(results))
            return results
        except Exception as e:
            logger.exception("Error fetching server details: {}", e)
            raise
        finally:
            cursor.close()
            connection.close()

    def fetch_server_detail(self, region: str, ip: str):
        connection = self.get_connection()
        cursor = connection.cursor()
        try:
            query = """
                SELECT
                    ts,
                    region,
                    primary_ip,
                    instance_id,
                    hostname,
                    fqdn,
                    all_ips,
                    os_name,
                    os_version,
                    os_release,
                    kernel_version,
                    kernel_release,
                    architecture,
                    platform,
                    python_version,
                    current_username,
                    home_directory,
                    watcher_directory,
                    apps_directory,
                    boot_time,
                    cpu_count_logical,
                    cpu_count_physical,
                    total_memory_mb,
                    compliant_status,
                    watcher_status,
                    watcher_version,
                    crons,
                    last_ingested_at
                FROM server_details
                WHERE region = %s AND primary_ip = %s
                LIMIT 1
            """
            cursor.execute(query, (region, ip))
            result = cursor.fetchone()
            logger.info("Fetched server detail row for region {} ip {}: {}.", region, ip, bool(result))
            return result
        except Exception as e:
            logger.exception("Error fetching server detail for region {} ip {}: {}", region, ip, e)
            raise
        finally:
            cursor.close()
            connection.close()

    def fetch_configured_server_details(self):
        connection = self.get_connection()
        cursor = connection.cursor(dictionary=True)
        try:
            query = """
                SELECT
                    region,
                    primary_ip,
                    hostname
                FROM server_details
                WHERE watcher_status = 'configured'
            """
            cursor.execute(query)
            results = cursor.fetchall()
            logger.info("Fetched {} configured server detail rows.", len(results))
            return results
        except Exception as e:
            logger.exception("Error fetching configured server details: {}", e)
            raise
        finally:
            cursor.close()
            connection.close()

    def sync_server_details_from_aws(self, aws_rows: List[Dict], watcher_status_updates: List[Dict]) -> Dict:
        connection = self.get_connection()
        cursor = connection.cursor()
        inserted = updated = compliant_updates = 0

        upsert_sql = """
            INSERT INTO server_details (
                ts,
                region,
                hostname,
                fqdn,
                instance_id,
                primary_ip,
                all_ips,
                os_name,
                os_version,
                os_release,
                kernel_version,
                kernel_release,
                architecture,
                platform,
                python_version,
                current_username,
                home_directory,
                watcher_directory,
                apps_directory,
                boot_time,
                cpu_count_logical,
                cpu_count_physical,
                total_memory_mb,
                compliant_status,
                watcher_status,
                crons,
                tags,
                last_ingested_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
            )
            ON DUPLICATE KEY UPDATE
                ts = VALUES(ts),
                hostname = VALUES(hostname),
                fqdn = VALUES(fqdn),
                instance_id = VALUES(instance_id),
                primary_ip = VALUES(primary_ip),
                all_ips = VALUES(all_ips),
                os_name = VALUES(os_name),
                os_version = VALUES(os_version),
                os_release = VALUES(os_release),
                kernel_version = VALUES(kernel_version),
                kernel_release = VALUES(kernel_release),
                architecture = VALUES(architecture),
                platform = VALUES(platform),
                python_version = VALUES(python_version),
                current_username = VALUES(current_username),
                home_directory = VALUES(home_directory),
                watcher_directory = VALUES(watcher_directory),
                apps_directory = VALUES(apps_directory),
                boot_time = VALUES(boot_time),
                cpu_count_logical = VALUES(cpu_count_logical),
                cpu_count_physical = VALUES(cpu_count_physical),
                total_memory_mb = VALUES(total_memory_mb),
                compliant_status = VALUES(compliant_status),
                watcher_status = VALUES(watcher_status),
                crons = VALUES(crons),
                tags = VALUES(tags),
                last_ingested_at = NOW()
        """

        watcher_update_sql = """
            UPDATE server_details
            SET hostname = %s,
                boot_time = %s,
                cpu_count_logical = %s,
                cpu_count_physical = %s,
                total_memory_mb = %s,
                compliant_status = %s,
                instance_id = %s,
                tags = %s,
                last_ingested_at = NOW()
            WHERE region = %s
              AND primary_ip = %s
              AND watcher_status = 'configured'
        """

        try:
            for row in aws_rows:
                cursor.execute(
                    "SELECT id FROM server_details WHERE region = %s AND primary_ip = %s LIMIT 1",
                    (row["region"], row["primary_ip"]),
                )
                existing = cursor.fetchone()
                cursor.execute(
                    upsert_sql,
                    (
                        row["ts"],
                        row["region"],
                        row["hostname"],
                        row["fqdn"],
                        row["instance_id"],
                        row["primary_ip"],
                        json.dumps(row["all_ips"]),
                        row["os_name"],
                        row["os_version"],
                        None,
                        None,
                        None,
                        None,
                        row["platform"],
                        None,
                        None,
                        None,
                        None,
                        None,
                        row["boot_time"],
                        row["cpu_count_logical"],
                        row["cpu_count_physical"],
                        row["total_memory_mb"],
                        row["compliant_status"],
                        row["watcher_status"],
                        json.dumps([]),
                        json.dumps(row.get("tags") or {}),
                    ),
                )
                if existing:
                    updated += 1
                else:
                    inserted += 1

            for row in watcher_status_updates:
                cursor.execute(
                    watcher_update_sql,
                    (
                        row["hostname"],
                        row["boot_time"],
                        row["cpu_count_logical"],
                        row["cpu_count_physical"],
                        row["total_memory_mb"],
                        row["compliant_status"],
                        row["instance_id"],
                        json.dumps(row.get("tags") or {}),
                        row["region"],
                        row["primary_ip"],
                    ),
                )
                compliant_updates += cursor.rowcount

            connection.commit()
            logger.info(
                "Synced AWS server details. inserted={} updated={} compliant_updates={}",
                inserted,
                updated,
                compliant_updates,
            )
            return {
                "inserted": inserted,
                "updated": updated,
                "compliant_updates": compliant_updates,
            }
        except Exception as e:
            connection.rollback()
            logger.exception("Error syncing AWS server details: {}", e)
            raise
        finally:
            cursor.close()
            connection.close()

    ###############################################################################################
    #                                  AUTH SECTION FUNCTIONS                                     #
    ###############################################################################################
    def get_user(self, username: str) -> User:
        conn = self.get_connection()
        cur  = conn.cursor()
        try:
            query = """
                SELECT
                    u.id,
                    u.username,
                    u.hashed_password,
                    u.auth_provider,
                    u.external_id,
                    u.display_name,
                    r.name AS role_name,
                    r.permissions
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.username = %s
            """
            cur.execute(query, (username,))
            row = cur.fetchone()
            if not row:
                return None
            user_id, usern, pw, auth_provider, external_id, display_name, role_name, perms = row
            if isinstance(perms, str):
                perms = json.loads(perms)

            role = Role(name=role_name, permissions=perms)
            user = User(
                id=user_id,
                username=usern,
                hashed_password=pw,
                auth_provider=auth_provider or "local",
                external_id=external_id,
                display_name=display_name,
                role=role
            )
            return user
        finally:
            cur.close()
            conn.close()

    def get_user_by_external_id(self, external_id: str) -> User:
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            query = """
                SELECT
                    u.id,
                    u.username,
                    u.hashed_password,
                    u.auth_provider,
                    u.external_id,
                    u.display_name,
                    r.name AS role_name,
                    r.permissions
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.external_id = %s
                LIMIT 1
            """
            cur.execute(query, (external_id,))
            row = cur.fetchone()
            if not row:
                return None

            user_id, usern, pw, auth_provider, ext_id, display_name, role_name, perms = row
            if isinstance(perms, str):
                perms = json.loads(perms)

            return User(
                id=user_id,
                username=usern,
                hashed_password=pw,
                auth_provider=auth_provider or "local",
                external_id=ext_id,
                display_name=display_name,
                role=Role(name=role_name, permissions=perms),
            )
        finally:
            cur.close()
            conn.close()

    def create_user(self, username: str, hashed_password: str, role: str = 'viewer') -> Dict:
        conn = self.get_connection()
        cur  = conn.cursor()
        
        try:
            query = """SELECT id FROM roles WHERE name = %s"""
            cur.execute(query, (role,))
            r = cur.fetchone()
            if not r:
                raise ValueError(f"Unknown role: {role}")
            role_id = r[0]
            query = """INSERT INTO users (username, hashed_password, role_id) VALUES (%s, %s, %s)"""
            cur.execute(query, (username, hashed_password, role_id))
            new_id = cur.lastrowid
            conn.commit()
            return {
                "id": new_id, 
                "username": username, 
                "role": role
                }
        except:
            conn.rollback()
            raise
        finally:
            cur.close()
            conn.close()

    def create_sso_user(
        self,
        username: str,
        external_id: str,
        display_name: str = None,
        role: str = "viewer",
        auth_provider: str = "microsoft_entra",
    ) -> Dict:
        conn = self.get_connection()
        cur = conn.cursor()

        try:
            cur.execute("SELECT id FROM roles WHERE name = %s", (role,))
            role_row = cur.fetchone()
            if not role_row:
                raise ValueError(f"Unknown role: {role}")

            cur.execute(
                """
                INSERT INTO users (username, hashed_password, role_id, auth_provider, external_id, display_name)
                VALUES (%s, NULL, %s, %s, %s, %s)
                """,
                (username, role_row[0], auth_provider, external_id, display_name),
            )
            conn.commit()
            return {"id": cur.lastrowid, "username": username, "role": role}
        except:
            conn.rollback()
            raise
        finally:
            cur.close()
            conn.close()

    def sync_sso_user_identity(
        self,
        username: str,
        external_id: str,
        display_name: str = None,
        auth_provider: str = "microsoft_entra",
    ) -> None:
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                """
                UPDATE users
                SET username = %s,
                    auth_provider = %s,
                    external_id = %s,
                    display_name = %s
                WHERE external_id = %s OR username = %s
                """,
                (username, auth_provider, external_id, display_name, external_id, username),
            )
            conn.commit()
        except:
            conn.rollback()
            raise
        finally:
            cur.close()
            conn.close()

    def update_user_role(self, username: str, new_role: str) -> Dict:
        conn = self.get_connection()
        cur  = conn.cursor()
        try:
            query = """SELECT id FROM roles WHERE name = %s"""
            cur.execute(query, (new_role,))
            r = cur.fetchone()
            if not r:
                raise ValueError(f"Unknown role: {new_role}")
            role_id = r[0]
            query = """UPDATE users SET role_id = %s WHERE username = %s"""
            cur.execute(query, (role_id, username))
            if cur.rowcount == 0:
                raise ValueError(f"No such user: {username}")
            conn.commit()
            return {
                "username": username, 
                "new_role": new_role
                }
        except:
            conn.rollback()
            raise
        finally:
            cur.close()
            conn.close()

    def delete_user(self, username: str) -> Dict:
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM users WHERE username = %s", (username,))
            if cur.rowcount == 0:
                raise ValueError(f"No such user: {username}")
            conn.commit()
            return {"username": username}
        except:
            conn.rollback()
            raise
        finally:
            cur.close()
            conn.close()

    def fetch_users_with_roles(self) -> List[Dict]:
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            query = """
                SELECT u.id, u.username, r.name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                ORDER BY u.username
            """
            cur.execute(query)
            rows = cur.fetchall()
            return [
                {
                    "id": row[0],
                    "username": row[1],
                    "role_name": row[2],
                }
                for row in rows
            ]
        finally:
            cur.close()
            conn.close()

    def fetch_role_names(self) -> List[str]:
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("SELECT name FROM roles ORDER BY name")
            rows = cur.fetchall()
            return [row[0] for row in rows]
        finally:
            cur.close()
            conn.close()

    def fetch_roles_with_permissions(self) -> List[Dict]:
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("SELECT name, permissions FROM roles ORDER BY name")
            rows = cur.fetchall()
            return [
                {
                    "name": row[0],
                    "permissions": json.loads(row[1]) if isinstance(row[1], str) else row[1],
                }
                for row in rows
            ]
        finally:
            cur.close()
            conn.close()

    ###############################################################################################
    #                              TABLE PREFERENCES SECTION FUNCTIONS                            #
    ###############################################################################################
    def fetch_table_preferences(self, user_id: int, table_key: str) -> Optional[List[str]]:
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT columns FROM user_table_preferences WHERE user_id = %s AND table_key = %s LIMIT 1",
                (user_id, table_key),
            )
            row = cur.fetchone()
            if not row:
                return None
            columns = row[0]
            return json.loads(columns) if isinstance(columns, str) else columns
        finally:
            cur.close()
            conn.close()

    def upsert_table_preferences(self, user_id: int, table_key: str, columns: List[str]) -> None:
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO user_table_preferences (user_id, table_key, columns)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE columns = VALUES(columns)
                """,
                (user_id, table_key, json.dumps(columns)),
            )
            conn.commit()
        finally:
            cur.close()
            conn.close()
