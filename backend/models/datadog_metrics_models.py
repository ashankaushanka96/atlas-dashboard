from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


class DatadogMetricSeries(BaseModel):
    metric: Optional[str] = None
    expression: Optional[str] = None
    scope: Optional[str] = None
    tag_set: Optional[List[str]] = None
    display_name: Optional[str] = None
    pointlist: List[List[Optional[float]]]
    unit: Optional[List[Optional[Dict[str, Any]]]] = None


class FetchDatadogMetricResponse(BaseModel):
    status_code: int
    host: str
    component: Optional[str] = None
    period: int
    from_ts: int
    to_ts: int
    metric: str
    query: str
    response_type: Literal["series", "last_value"]
    series: Optional[List[DatadogMetricSeries]] = None
    value: Optional[float] = None
    timestamp_ms: Optional[int] = None
