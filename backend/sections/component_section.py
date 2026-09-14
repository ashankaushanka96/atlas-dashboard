from loguru import logger
from typing import List
import cache
from subsystems.database import Database
from models.component_section_models import (
    FetchAllRegionsResponse,
    FetchPlatformsResponse,
    FetchComponentsResponse,
    FetchComponentDetailResponse,
    Component,
    ComponentSummary,
    AddComponentResponse,
    DeleteComponentResponse,
    SyncComponentsResponse,)

class ComponentSection:
    def __init__(self, db: Database, config: dict):
        self.db = db
        self.config = config

        self.all_regions = self.config.get("all_regions", [])
        self.platforms = self.config.get("platforms", [])
        
    def fetch_all_regions(self):
        logger.info("Fetching All Regions.")
        return FetchAllRegionsResponse(status_code=200, regions=self.all_regions)

    def fetch_platforms(self):
        logger.info("Fetching Platforms.")
        return FetchPlatformsResponse(status_code=200, platforms=self.platforms)

    def fetch_components(self, fresh: bool = False):
        logger.info("Fetching components; fresh flag is {}.", fresh)
        if fresh or cache.cached_components is None:
            try:
                results = self.db.fetch_component_summaries()
                components = list(
                    map(
                        lambda row: ComponentSummary(
                            region=row[0],
                            ip=row[1],
                            component_name=row[2],
                            platform=row[3],
                            comp_path=row[4],
                            comp_version=row[5],
                            pipeline=self._normalize_component_toggle(row[6]),
                            watcher=self._normalize_component_toggle(row[7]),
                            release_date=row[8],
                            code_repo_url=row[9],
                            category=row[10],
                            config_meta=row[11],
                            asset_custodian=row[12],
                        ),
                        results,
                    )
                )
                cache.cached_components = components
                logger.info("Components cache updated with fresh data.")
            except Exception as e:
                logger.exception("Error fetching fresh components: {}", e)
                raise
        logger.info("Returning components from cache.")
        return FetchComponentsResponse(status_code=200, components=cache.cached_components)

    def fetch_component_detail(
        self,
        region: str,
        ip: str,
        component_name: str,
        platform: str,
        comp_path: str,
    ):
        logger.info(
            "Fetching component detail for region={} ip={} component={}.",
            region,
            ip,
            component_name,
        )
        try:
            row = self.db.fetch_component_detail(region, ip, component_name, platform, comp_path)
            if row is None:
                raise ValueError("Component detail not found.")

            component = Component(
                region=row[0],
                ip=row[1],
                component_name=row[2],
                platform=row[3],
                comp_path=row[4],
                comp_version=row[5],
                pipeline=self._normalize_component_toggle(row[6]),
                last_run_time=row[7],
                last_update_time=row[8],
                previous_tag=row[9],
                release_date=row[10],
                code_repo_url=row[11],
                config_repo_url=row[12],
                script_repo_url=row[13],
                description=row[14],
                watcher=self._normalize_component_toggle(row[15]),
                config_meta=row[16],
                category=row[17],
            )
            return FetchComponentDetailResponse(status_code=200, component=component)
        except Exception as e:
            logger.exception("Error fetching component detail: {}", e)
            raise

    def _normalize_component_toggle(self, value):
        if value is None:
            return None
        return "Configured" if bool(value) else "Unconfigured"
    
    def fetch_components_by_ip(self, ip: str, region: str):
        logger.info("Fetching components by IP: {}.", ip)
        try:
            results = self.db.fetch_components_by_ip(ip, region)
            components = list(
                map(
                    lambda row: ComponentSummary(
                        region=row[0],
                        ip=row[1],
                        component_name=row[2],
                        platform=row[3],
                        comp_path=row[4],
                        pipeline=self._normalize_component_toggle(row[5]),
                        watcher=self._normalize_component_toggle(row[6]),
                        config_meta=row[7],
                    ),
                    results,
                )
            )
            logger.info("Components cache updated with fresh data.")
        except Exception as e:
            logger.exception("Error fetching fresh components: {}", e)
            raise
        logger.info("Returning components from cache.")
        return FetchComponentsResponse(status_code=200, components=components)


    def add_component(self, component: Component):
        logger.info("Adding component: {}", component)
        try:
            self.db.add_component(component)
            return AddComponentResponse(status_code=200, message=f"Component added successfully: {component.component_name}")
        except Exception as e:
            logger.exception("Error adding component: {}", e)
            raise

    def delete_component(self, component: Component):
        logger.info("Deleting component: {}", component)
        try:
            self.db.delete_component(component)
            logger.info(f"Component deleted successfully: {component.component_name}")
            return DeleteComponentResponse(
                status_code=200,
                message=f"Component deleted successfully: {component.component_name}",
            )
        except Exception as e:
            logger.exception("Error deleting component: {}", e)
            raise
        
    def sync_components(self, components: List[Component]) -> SyncComponentsResponse:
        logger.info("Syncing %d components", len(components))
        result = self.db.sync_components(components)
        return SyncComponentsResponse(
            status_code=200,
            message="Components synchronized successfully",
            added=result["added"],
            updated=result["updated"],
            deleted=result["deleted"],
        )
