from fastapi import APIRouter, Depends

from facade import facade
from models.table_preferences_models import (
    FetchTablePreferencesResponse,
    SaveTablePreferencesRequest,
    SaveTablePreferencesResponse,
)

router = APIRouter(prefix="/api/v1/table-preferences", tags=["Table Preferences"])


@router.get("/{table_key}", response_model=FetchTablePreferencesResponse)
def fetch_table_preferences(
    table_key: str,
    current_user=Depends(facade.auth.get_current_user),
):
    return facade.table_preferences_section.get(current_user.id, table_key)


@router.put("/{table_key}", response_model=SaveTablePreferencesResponse)
def save_table_preferences(
    table_key: str,
    payload: SaveTablePreferencesRequest,
    current_user=Depends(facade.auth.get_current_user),
):
    return facade.table_preferences_section.save(current_user.id, table_key, payload.columns)
