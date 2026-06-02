from fastapi import APIRouter, HTTPException
from app.schemas.schemas import MercadoLivreConfigBase, MercadoLivreConfigResponse, ShopeeConfigBase, ShopeeConfigResponse
from app.services.sheets import sheets_db

router = APIRouter()

@router.get("/mercado-livre", response_model=MercadoLivreConfigResponse)
async def get_mercado_livre_config():
    try:
        return sheets_db.get_ml_config()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/mercado-livre", response_model=MercadoLivreConfigResponse)
async def update_mercado_livre_config(cfg_in: MercadoLivreConfigBase):
    try:
        cfg_dict = cfg_in.dict()
        return sheets_db.update_ml_config(cfg_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/shopee", response_model=ShopeeConfigResponse)
async def get_shopee_config():
    try:
        return sheets_db.get_shopee_config()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/shopee", response_model=ShopeeConfigResponse)
async def update_shopee_config(cfg_in: ShopeeConfigBase):
    try:
        cfg_dict = cfg_in.dict()
        return sheets_db.update_shopee_config(cfg_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
