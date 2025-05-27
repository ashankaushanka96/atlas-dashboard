from models.response_models import FetchRoute53Response,FetchSingleZoneResponse
from facade import Facade
from fastapi import APIRouter, Query

facade = Facade()

router = APIRouter(prefix="/api/v1/route53")

@router.get("/fetch-zones", response_model=FetchRoute53Response)
def fetch_zones():
    return facade.get_all_zones()

@router.get("/fetch-zone-detail", response_model=FetchSingleZoneResponse)
def fetch_zones_detail(zone_name: str = Query(...)):
    return facade.get_single_zone(zone_name)

@router.get("/fetch-zone-names")
def get_zone_names():
    return facade.get_zone_names()