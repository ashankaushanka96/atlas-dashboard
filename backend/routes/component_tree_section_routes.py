from models.component_tree_section_models import *
from facade import facade
from fastapi import APIRouter, Depends, Query
from typing import Dict, Any

router = APIRouter(prefix="/api/v1/component-tree", tags=["Component_Tree"])

store: Dict[str, Dict[str, Any]] = {}

@router.get("/map", response_model=MapResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_component_tree"))])
async def get_component_map(fresh: bool = Query(False, description="Set to true to bypass cache and recompute")):
    return await facade.component_tree_section.get_component_map(fresh=fresh)

@router.get("/unconfigured", response_model=UnconfiguredResponse, dependencies=[Depends(facade.auth.require_permission_flexible("view_component_tree"))])
async def get_unconfigured_components():
    return await facade.component_tree_section.get_unconfigured_components()
