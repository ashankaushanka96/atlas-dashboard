# authentication_routes.py

from fastapi import APIRouter, Depends, HTTPException
from models.authentication_models import *
from facade import facade

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut)
def register(user: UserCreate):
    return facade.auth.register(user)

@router.post("/user/local", response_model=CreateLocalUserResponse, dependencies=[Depends(facade.auth.require_permission("user_management"))])
def create_local_user(user: LocalUserCreateRequest):
    return facade.auth.create_local_user(user)

@router.post("/refresh/token", response_model=RefreshTokenResponse, summary="Login and receive a refresh token")
def login_for_refresh(user: UserLogin):
    return facade.auth.login_for_refresh_token(user)

@router.post("/access/token", response_model=AccessTokenResponse, summary="Exchange refresh token for an access token")
def get_access_token(req: RefreshTokenRequest):
    return facade.auth.generate_access_token(req)

@router.post("/entra/access/token", response_model=AccessTokenResponse, summary="Exchange a Microsoft Entra access token for an app access token")
def exchange_entra_access_token(req: EntraAccessTokenExchangeRequest):
    return facade.auth.exchange_entra_access_token(req)

@router.get("/users/me", response_model=UserOut)
def read_users_me(current_user=Depends(facade.auth.get_current_user)):
    return facade.auth.read_users_me(current_user)

@router.get("/users/roles", response_model=FetchUsersWithRolesResponse, dependencies=[Depends(facade.auth.require_permission("user_management"))])
def fetch_users_with_roles():
    return facade.auth.fetch_users_with_roles()

@router.get("/protected")
def protected_route(current_user=Depends(facade.auth.get_current_user)):
    return facade.auth.protected_route(current_user)

@router.patch("/user/role", response_model=ChangeUserRoleResponse, dependencies=[Depends(facade.auth.require_permission("user_management"))])
def change_role(payload: ChangeUserRoleRequest, current_user=Depends(facade.auth.get_current_user)):
    if payload.username == current_user.username:
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    updated = facade.auth.change_user_role(payload.username, payload.new_role)
    return ChangeUserRoleResponse(
        user_details=updated,
        message=f"Role updated successfully for user {payload.username}"
    )

@router.delete("/user/{username}", response_model=DeleteUserResponse, dependencies=[Depends(facade.auth.require_permission("user_management"))])
def delete_user(username: str, current_user=Depends(facade.auth.get_current_user)):
    if username == current_user.username:
        raise HTTPException(status_code=400, detail="You cannot delete your own user")
    return facade.auth.delete_user(username)

# API Key based authentication endpoints (for backend-to-backend access)
@router.get("/api-key/validate")
def validate_api_key(api_key_auth=Depends(facade.auth.get_current_api_key)):
    return {
        "message": "API key is valid",
        "key_name": api_key_auth.name,
        "permissions": api_key_auth.permissions
    }

@router.get("/api-key/protected")
def api_key_protected_route(api_key_auth=Depends(facade.auth.require_api_key_permission("read_components"))):
    return {
        "message": f"Hello from API key: {api_key_auth.name} - you have access to this protected resource",
        "permissions": api_key_auth.permissions
    }
