from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class LambdaFunctionSummary(BaseModel):
    region: str
    function_name: str
    function_arn: str
    runtime: Optional[str]
    memory_size: Optional[int]
    timeout: Optional[int]
    last_modified: Optional[str]
    code_size: Optional[int]
    description: Optional[str]
    state: Optional[str]

class LambdaFunctionDetails(BaseModel):
    function_name: str
    function_arn: str
    runtime: Optional[str]
    role: Optional[str]
    handler: Optional[str]
    code_size: Optional[int]
    description: Optional[str]
    timeout: Optional[int]
    memory_size: Optional[int]
    last_modified: Optional[str]
    version: Optional[str]
    environment_variables: Optional[Dict[str, str]]
    tags: Optional[List[Dict[str, str]]]
    vpc_config: Optional[Dict[str, Any]]
    layers: Optional[List[Dict[str, Any]]]

class FetchLambdaFunctionsSummaryResponse(BaseModel):
    status_code: int
    functions: List[LambdaFunctionSummary]

class FetchLambdaFunctionDetailsResponse(BaseModel):
    status_code: int
    function_details: LambdaFunctionDetails
