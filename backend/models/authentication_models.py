# authentication_models.py

from pydantic import BaseModel
from typing import Dict, List, Optional

class UserCreate(BaseModel):
    username: str
    password: str

class LocalUserCreateRequest(BaseModel):
    username: str
    password: str
    role: str = "viewer"

class UserLogin(BaseModel):
    username: str
    password: str

class Role(BaseModel):
    name: str
    permissions: Dict[str, bool] = {}

class User(BaseModel):
    id: int
    username: str
    hashed_password: Optional[str] = None
    auth_provider: str = "local"
    external_id: Optional[str] = None
    display_name: Optional[str] = None
    role: Role

class UserOut(BaseModel):
    id: int
    username: str
    auth_provider: str = "local"
    external_id: Optional[str] = None
    display_name: Optional[str] = None
    role: Role

class RefreshTokenResponse(BaseModel):
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class EntraAccessTokenExchangeRequest(BaseModel):
    access_token: str

class ChangeUserRoleRequest(BaseModel):
    username: str
    new_role: str

class ChangeUserRoleResponse(BaseModel):
    user_details: UserOut
    message: str

class CreateLocalUserResponse(BaseModel):
    user_details: UserOut
    message: str

class DeleteUserResponse(BaseModel):
    username: str
    message: str

class UserRoleSummary(BaseModel):
    id: int
    username: str
    role_name: str

class RolePermissionsSummary(BaseModel):
    name: str
    permissions: Dict[str, bool]

class FetchUsersWithRolesResponse(BaseModel):
    users: List[UserRoleSummary]
    available_roles: List[str]
    role_permissions: List[RolePermissionsSummary]

class ApiKeyAuth(BaseModel):
    key: str
    name: str
    description: str
    permissions: Dict[str, bool]
