# authentication_service.py
from datetime import datetime, timedelta
import json
import os
import time
from typing import Optional
from urllib.request import urlopen

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from models.authentication_models import (
    AccessTokenResponse,
    ApiKeyAuth,
    CreateLocalUserResponse,
    DeleteUserResponse,
    EntraAccessTokenExchangeRequest,
    FetchUsersWithRolesResponse,
    LocalUserCreateRequest,
    RefreshTokenRequest,
    RefreshTokenResponse,
    Role,
    RolePermissionsSummary,
    User,
    UserCreate,
    UserLogin,
    UserOut,
    UserRoleSummary,
)
from subsystems.database import Database
from utils.config import load_config

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "changeme-replace-with-a-random-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30
OIDC_CACHE_TTL_SECONDS = 3600

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/access/token")
pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],
    default="bcrypt_sha256",
    deprecated="auto",
    bcrypt__truncate_error=False,
)


class AuthenticationService:
    def __init__(self, db: Database, cache_ttl_seconds: int = 300, cache_maxsize: int = 1024):
        self.db = db
        self.config = load_config()
        self.api_keys = self._load_api_keys()
        self.entra_config = self._load_entra_config()
        self._oidc_config = None
        self._oidc_config_expiry = 0
        self._jwks = None
        self._jwks_expiry = 0

    def require_permission(self, name: str):
        async def checker(current_user=Depends(self.get_current_user)):
            if not current_user.role.permissions.get(name, False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing permission: {name}",
                )
            return True

        return checker

    def _load_api_keys(self):
        api_keys_config = self.config.get("api_keys", [])
        return {
            key_config["key"]: ApiKeyAuth(
                key=key_config["key"],
                name=key_config["name"],
                description=key_config["description"],
                permissions=key_config["permissions"],
            )
            for key_config in api_keys_config
        }

    def _load_entra_config(self):
        entra_config = self.config.get("entra", {}) or {}
        tenant_id = entra_config.get("tenant_id", "").strip()
        authority = entra_config.get("authority", "").strip()
        api_audience = (entra_config.get("api_audience") or "").strip()

        if not authority and tenant_id:
            authority = f"https://login.microsoftonline.com/{tenant_id}"

        if not api_audience and entra_config.get("client_id"):
            api_audience = f"api://{entra_config['client_id'].strip()}"

        return {
            "enabled": bool(entra_config.get("enabled", False)),
            "tenant_id": tenant_id,
            "client_id": (entra_config.get("client_id") or "").strip(),
            "authority": authority.rstrip("/"),
            "api_audience": api_audience,
            "api_scope_name": (entra_config.get("api_scope_name") or "access_as_user").strip(),
            "auto_create_users": bool(entra_config.get("auto_create_users", True)),
            "default_role": (entra_config.get("default_role") or "viewer").strip(),
        }

    def _ensure_local_auth_enabled(self):
        if self.entra_config["enabled"]:
            raise HTTPException(
                status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
                detail="Local username/password authentication is disabled. Use Microsoft Entra sign-in.",
            )

    def _fetch_json(self, url: str):
        with urlopen(url, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))

    def _get_oidc_config(self):
        now = time.time()
        if self._oidc_config and now < self._oidc_config_expiry:
            return self._oidc_config

        authority = self.entra_config.get("authority")
        if not authority or not self.entra_config.get("client_id"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Microsoft Entra configuration is incomplete.",
            )

        metadata_url = f"{authority}/v2.0/.well-known/openid-configuration"
        try:
            self._oidc_config = self._fetch_json(metadata_url)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to load Microsoft Entra OpenID configuration.",
            ) from exc

        self._oidc_config_expiry = now + OIDC_CACHE_TTL_SECONDS
        return self._oidc_config

    def _get_jwks(self, force_refresh: bool = False):
        now = time.time()
        if not force_refresh and self._jwks and now < self._jwks_expiry:
            return self._jwks

        oidc_config = self._get_oidc_config()
        try:
            self._jwks = self._fetch_json(oidc_config["jwks_uri"])
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to load Microsoft Entra signing keys.",
            ) from exc

        self._jwks_expiry = now + OIDC_CACHE_TTL_SECONDS
        return self._jwks

    def validate_api_key(self, api_key: str) -> ApiKeyAuth:
        if api_key in self.api_keys:
            return self.api_keys[api_key]
        return None

    def require_api_key_permission(self, permission_name: str):
        def checker(x_api_key: str = Header(None, alias="X-API-Key")):
            if not x_api_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API key is required",
                )

            api_key_auth = self.validate_api_key(x_api_key)
            if not api_key_auth:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid API key",
                )

            if not api_key_auth.permissions.get(permission_name, False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"API key does not have permission: {permission_name}",
                )

            return api_key_auth

        return checker

    def get_current_api_key(self, x_api_key: str = Header(None, alias="X-API-Key")):
        if not x_api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key is required",
            )

        api_key_auth = self.validate_api_key(x_api_key)
        if not api_key_auth:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )

        return api_key_auth

    def get_user(self, username: str):
        return self.db.get_user(username)

    def create_user(self, username: str, password: str, role: str = "viewer"):
        hashed = pwd_context.hash(password)
        self.db.create_user(username, hashed, role)
        created = self.get_user(username)
        return self._to_user_out(created)

    def register(self, user: UserCreate):
        self._ensure_local_auth_enabled()
        if self.get_user(user.username):
            raise ValueError("Username already registered")
        return self.create_user(user.username, user.password)

    def create_local_user(self, user: LocalUserCreateRequest) -> CreateLocalUserResponse:
        self._ensure_local_auth_enabled()
        if self.get_user(user.username):
            raise ValueError("Username already registered")
        created = self.create_user(user.username, user.password, user.role)
        return CreateLocalUserResponse(
            user_details=created,
            message=f"Local user created for {user.username}",
        )

    def verify_password(self, plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    def authenticate_user(self, username: str, password: str):
        user = self.get_user(username)
        if (
            not user
            or not user.hashed_password
            or user.auth_provider != "local"
            or not self.verify_password(password, user.hashed_password)
        ):
            return False
        return user

    def _create_token(self, subject: str, expires_delta: timedelta, extra: dict):
        to_encode = {"sub": subject, **extra, "exp": datetime.utcnow() + expires_delta}
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    def create_refresh_token(self, username: str) -> str:
        return self._create_token(
            subject=username,
            expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            extra={"type": "refresh"},
        )

    def _build_access_token_claims(self, user: User) -> dict:
        return {
            "user_id": user.id,
            "username": user.username,
            "auth_provider": user.auth_provider,
            "external_id": user.external_id,
            "display_name": user.display_name,
            "role_name": user.role.name,
            "permissions": user.role.permissions,
            "type": "access",
        }

    def create_access_token(self, user: User) -> str:
        return self._create_token(
            subject=user.username,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            extra=self._build_access_token_claims(user),
        )

    def login_for_refresh_token(self, user: UserLogin) -> RefreshTokenResponse:
        self._ensure_local_auth_enabled()
        user = self.authenticate_user(user.username, user.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = self.create_refresh_token(user.username)
        return RefreshTokenResponse(refresh_token=token)

    def generate_access_token(self, req: RefreshTokenRequest) -> AccessTokenResponse:
        self._ensure_local_auth_enabled()
        creds_exc = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(req.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "refresh":
                raise creds_exc
            username = payload.get("sub")
            if not username:
                raise creds_exc
        except JWTError:
            raise creds_exc

        user = self.get_user(username)
        if not user:
            raise creds_exc

        token = self.create_access_token(user)
        return AccessTokenResponse(access_token=token)

    def exchange_entra_access_token(self, req: EntraAccessTokenExchangeRequest) -> AccessTokenResponse:
        if not self.entra_config["enabled"]:
            raise HTTPException(
                status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
                detail="Microsoft Entra authentication is not enabled.",
            )

        user = self._decode_entra_token(req.access_token)
        token = self.create_access_token(user)
        return AccessTokenResponse(access_token=token)

    def _decode_local_access_token(self, token: str):
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise JWTError("Unexpected local token type")
        username = payload.get("sub")
        if not username:
            raise JWTError("Missing token subject")

        permissions = payload.get("permissions")
        role_name = payload.get("role_name")
        user_id = payload.get("user_id")
        if isinstance(permissions, dict) and role_name and user_id is not None:
            return User(
                id=user_id,
                username=payload.get("username") or username,
                auth_provider=payload.get("auth_provider") or "local",
                external_id=payload.get("external_id"),
                display_name=payload.get("display_name"),
                role=Role(name=role_name, permissions=permissions),
            )

        # Compatibility path for older access tokens issued before user claims were embedded.
        user = self.get_user(username)
        if not user:
            raise JWTError("Unknown user")
        return user

    def _decode_entra_token(self, token: str):
        oidc_config = self._get_oidc_config()
        headers = jwt.get_unverified_header(token)
        unverified_claims = jwt.get_unverified_claims(token)
        key_id = headers.get("kid")
        algorithms = [headers.get("alg", "RS256")]
        api_audience = self.entra_config.get("api_audience")
        api_scope_name = self.entra_config.get("api_scope_name")
        tenant_id = self.entra_config.get("tenant_id")
        client_id = self.entra_config.get("client_id")
        accepted_issuers = [oidc_config["issuer"]]
        accepted_audiences = []
        if api_audience:
            accepted_audiences.append(api_audience)
        if client_id and client_id not in accepted_audiences:
            accepted_audiences.append(client_id)
        if tenant_id:
            accepted_issuers.append(f"https://sts.windows.net/{tenant_id}/")

        jwks = self._get_jwks()
        keys = jwks.get("keys", [])
        key = next((item for item in keys if item.get("kid") == key_id), None)
        if not key:
            jwks = self._get_jwks(force_refresh=True)
            key = next((item for item in jwks.get("keys", []) if item.get("kid") == key_id), None)
        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to validate Microsoft Entra token signature.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        claims = None
        last_decode_error = None
        for issuer in accepted_issuers:
            for audience in accepted_audiences:
                try:
                    claims = jwt.decode(
                        token,
                        key,
                        algorithms=algorithms,
                        audience=audience,
                        issuer=issuer,
                    )
                    break
                except JWTError as exc:
                    last_decode_error = exc
            if claims:
                break

        if not claims:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Microsoft Entra token.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from last_decode_error

        token_scopes = set((claims.get("scp") or "").split())
        if api_scope_name and api_scope_name not in token_scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Microsoft Entra token is missing the required API scope.",
            )

        username = (
            claims.get("preferred_username")
            or claims.get("email")
            or claims.get("upn")
            or claims.get("unique_name")
        )
        external_id = claims.get("oid") or claims.get("sub")
        display_name = claims.get("name") or username

        if not username or not external_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Microsoft Entra token is missing the required identity claims.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = self.db.get_user_by_external_id(external_id) or self.get_user(username)
        if user:
            self.db.sync_sso_user_identity(
                username=username,
                external_id=external_id,
                display_name=display_name,
            )
            return self.db.get_user_by_external_id(external_id) or self.get_user(username)

        if not self.entra_config["auto_create_users"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have a local role assignment yet. Ask an administrator to grant access.",
            )

        self.db.create_sso_user(
            username=username,
            external_id=external_id,
            display_name=display_name,
            role=self.entra_config["default_role"],
        )
        return self.db.get_user_by_external_id(external_id) or self.get_user(username)

    def _authenticate_bearer_token(self, token: str):
        creds_exc = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

        if not token:
            raise creds_exc

        try:
            return self._decode_local_access_token(token)
        except JWTError:
            if self.entra_config["enabled"]:
                return self._decode_entra_token(token)
            raise creds_exc

    async def get_current_user(self, token: str = Depends(oauth2_scheme)):
        return self._authenticate_bearer_token(token)

    def authenticate_websocket_token(self, token: Optional[str]):
        return self._authenticate_bearer_token(token)

    def _to_user_out(self, user) -> UserOut:
        return UserOut(
            id=user.id,
            username=user.username,
            auth_provider=user.auth_provider,
            external_id=user.external_id,
            display_name=user.display_name,
            role=Role(name=user.role.name, permissions=user.role.permissions),
        )

    def read_users_me(self, current_user):
        return self._to_user_out(current_user)

    def protected_route(self, current_user):
        return {"message": f"Hello, {current_user.username} - you are authenticated."}

    def change_user_role(self, username: str, new_role: str):
        self.db.update_user_role(username, new_role)
        updated = self.db.get_user(username)
        return self._to_user_out(updated)

    def fetch_users_with_roles(self) -> FetchUsersWithRolesResponse:
        users = self.db.fetch_users_with_roles()
        available_roles = self.db.fetch_role_names()
        role_permissions = self.db.fetch_roles_with_permissions()
        return FetchUsersWithRolesResponse(
            users=[UserRoleSummary(**user) for user in users],
            available_roles=available_roles,
            role_permissions=[RolePermissionsSummary(**role) for role in role_permissions],
        )

    def delete_user(self, username: str) -> DeleteUserResponse:
        self.db.delete_user(username)
        return DeleteUserResponse(
            username=username,
            message=f"Local role assignment removed for user {username}",
        )

    def get_current_user_or_api_key(
        self,
        authorization: Optional[str] = Header(None),
        x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    ):
        if x_api_key:
            api_key_auth = self.validate_api_key(x_api_key)
            if api_key_auth:
                return {"type": "api_key", "auth": api_key_auth}
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )

        if authorization and authorization.startswith("Bearer "):
            token = authorization[7:]
            return {"type": "user", "auth": self._authenticate_bearer_token(token)}

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: provide either Bearer token or X-API-Key header",
        )

    def require_permission_flexible(self, permission_name: str):
        def checker(auth_result=Depends(self.get_current_user_or_api_key)):
            if auth_result["type"] == "api_key":
                api_key_auth = auth_result["auth"]
                if not api_key_auth.permissions.get(permission_name, False):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"API key does not have permission: {permission_name}",
                    )
                return auth_result

            if auth_result["type"] == "user":
                user = auth_result["auth"]
                if not user.role.permissions.get(permission_name, False):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"User does not have permission: {permission_name}",
                    )
                return auth_result

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication",
            )

        return checker
