from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import MercadoLivreConfig, ShopeeConfig
from app.schemas.schemas import MercadoLivreConfigBase, MercadoLivreConfigResponse, ShopeeConfigBase, ShopeeConfigResponse

router = APIRouter()

@router.get("/mercado-livre", response_model=MercadoLivreConfigResponse)
async def get_mercado_livre_config(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MercadoLivreConfig))
    cfg = result.scalar_one_or_none()
    if not cfg:
        # Create default config if missing
        cfg = MercadoLivreConfig()
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
    return cfg

@router.put("/mercado-livre", response_model=MercadoLivreConfigResponse)
async def update_mercado_livre_config(cfg_in: MercadoLivreConfigBase, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MercadoLivreConfig))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = MercadoLivreConfig()
        db.add(cfg)
        
    for field, value in cfg_in.dict().items():
        setattr(cfg, field, value)
        
    await db.commit()
    await db.refresh(cfg)
    return cfg

@router.get("/shopee", response_model=ShopeeConfigResponse)
async def get_shopee_config(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ShopeeConfig))
    cfg = result.scalar_one_or_none()
    if not cfg:
        # Create default config if missing
        cfg = ShopeeConfig()
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
    return cfg

@router.put("/shopee", response_model=ShopeeConfigResponse)
async def update_shopee_config(cfg_in: ShopeeConfigBase, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ShopeeConfig))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = ShopeeConfig()
        db.add(cfg)
        
    for field, value in cfg_in.dict().items():
        setattr(cfg, field, value)
        
    await db.commit()
    await db.refresh(cfg)
    return cfg
