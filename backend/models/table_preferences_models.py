from typing import List, Optional
from pydantic import BaseModel


class SaveTablePreferencesRequest(BaseModel):
    columns: List[str]


class FetchTablePreferencesResponse(BaseModel):
    status_code: int
    columns: Optional[List[str]] = None


class SaveTablePreferencesResponse(BaseModel):
    status_code: int
    columns: List[str]
