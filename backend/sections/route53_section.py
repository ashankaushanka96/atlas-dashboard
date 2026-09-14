from concurrent.futures import ThreadPoolExecutor

from loguru import logger
import cache

from models.route53_section_models import (
    FetchRoute53Response,
    FetchSingleZoneResponse,
    ZoneModel,
)
from subsystems.aws import AWS


class Route53Section:
    def __init__(self, aws: AWS, config: dict):
        self.aws = aws
        self.hosted_zones = config.get("hosted_zones", {})

    @staticmethod
    def _normalize_zone_name(zone_name: str) -> str:
        return zone_name if zone_name.endswith(".") else f"{zone_name}."

    def _build_zone_model(self, zone_name: str, main_url: str) -> ZoneModel:
        logger.debug("Processing hosted zone: {} -> {}", zone_name, main_url)
        zone_data = self.aws.build_zone_data(zone_name, main_url)
        return ZoneModel(
            hosted_zone=zone_name.rstrip("."),
            main_url=main_url,
            primary=zone_data.get("primary"),
            secondary=zone_data.get("secondary"),
            active_target=zone_data.get("active_target"),
            active_alias_target=zone_data.get("active_alias_target"),
            active_location=zone_data.get("active_location"),
            routing_reason=zone_data.get("routing_reason"),
            error=None,
        )

    def get_all_zones(self, fresh: bool = False):
        logger.info("Fetching all Route 53 zones; fresh flag is {}.", fresh)
        if fresh or cache.cached_route53_details is None:
            try:
                zone_items = list(self.hosted_zones.items())
                max_workers = min(8, max(1, len(zone_items)))
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    zone_model_list = list(
                        executor.map(
                            lambda item: self._build_zone_model(item[0], item[1]),
                            zone_items,
                        )
                    )
                cache.cached_route53_details = zone_model_list
                cache.cached_route53_detail_by_zone = {
                    zone.hosted_zone: zone for zone in zone_model_list
                }
                logger.info("Route53 cache updated with fresh data.")
            except Exception as e:
                logger.exception("Failed to fetch Route 53 zone data: {}", e)
                raise
        else:
            zone_model_list = cache.cached_route53_details
            logger.info("Returning all Route53 zones from cache.")

        return FetchRoute53Response(status_code=200, route53_details=zone_model_list)

    def get_single_zone(self, zone_name: str, fresh: bool = False) -> FetchSingleZoneResponse:
        full_zone_name = self._normalize_zone_name(zone_name)
        logger.info("Fetching Route 53 details for zone: {}; fresh flag is {}.", full_zone_name, fresh)

        try:
            main_url = self.hosted_zones.get(full_zone_name)
            if not main_url:
                logger.warning("Zone '{}' not found in configuration.", full_zone_name)
                raise ValueError(f"Zone '{full_zone_name}' not found in configuration.")

            cached_zone_model = cache.cached_route53_detail_by_zone.get(full_zone_name.rstrip("."))
            if fresh or cached_zone_model is None:
                zone_model = self._build_zone_model(full_zone_name, main_url)
                cache.cached_route53_detail_by_zone[zone_model.hosted_zone] = zone_model
                if cache.cached_route53_details is not None:
                    cache.cached_route53_details = [
                        zone_model if zone.hosted_zone == zone_model.hosted_zone else zone
                        for zone in cache.cached_route53_details
                    ]
                logger.info("Updated Route53 single-zone cache for {}.", full_zone_name)
            else:
                zone_model = cached_zone_model
                logger.info("Returning single Route53 zone from cache for {}.", full_zone_name)
            logger.info("Successfully fetched zone details for: {}", full_zone_name)
            return FetchSingleZoneResponse(status_code=200, zone_detail=zone_model)
        except Exception as e:
            logger.exception("Error while processing zone '{}': {}", full_zone_name, e)
            raise

    def get_zone_names(self):
        return [zone_name.rstrip(".") for zone_name in self.hosted_zones.keys()]
