# database.py

import mysql.connector
import sys
from loguru import logger
from models.other_models import Component
from typing import List, Tuple


class Database:
    def __init__(self, db_config):
        self.db_config = db_config
        if not self.db_config:
            logger.error("Database configuration not found in config file.")
            sys.exit("Database configuration not found")

    def get_connection(self):
        try:
            connection = mysql.connector.connect(**self.db_config)
            logger.info("Database connection established.")
            return connection
        except mysql.connector.Error as e:
            logger.exception("Database connection error")
            raise

    ###############################################################################################
    #                                  COMPONENTS SECTION FUNCTIONS                               #
    ###############################################################################################
    def fetch_all_components(self):
        connection = self.get_connection()
        cursor = connection.cursor()

        try:
            query = "SELECT region, ip, component_name, platform, comp_path, comp_version, pipeline, last_run_time, last_updated_time, previous_tag, release_date, code_repo_url, config_repo_url, script_repo_url, description FROM components ORDER BY region, ip, component_name"
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

    def fetch_components_by_ip(self, ip: str, region: str):
        connection = self.get_connection()
        cursor = connection.cursor()

        try:
            query = "SELECT region, ip, component_name, platform, comp_path FROM components WHERE ip = %s AND region = %s ORDER BY region, ip, component_name"
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
