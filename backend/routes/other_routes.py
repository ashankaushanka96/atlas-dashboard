from models.response_models import *
from models.other_models import *
from models.input_models import *
from facade import Facade
from fastapi import APIRouter, Query, HTTPException
from typing import List

facade = Facade()

router = APIRouter(prefix="/api/v1")

@router.post("/login", response_model=LoginResponse)
def login(login_request: LoginRequest):
    return facade.login(login_request)
