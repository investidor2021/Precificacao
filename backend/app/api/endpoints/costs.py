from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.models.models import Packaging, OperationalCost
from app.schemas.schemas import (
    PackagingCreate, PackagingResponse, 
    OperationalCostCreate, OperationalCostResponse
)

router = APIRouter()

# --- Packaging Endpoints ---
@router.get("/packaging", response_model=List[PackagingResponse])
async def get_packagings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Packaging))
    return result.scalars().all()

@router.post("/packaging", response_model=PackagingResponse, status_code=status.HTTP_201_CREATED)
async def create_packaging(pkg_in: PackagingCreate, db: AsyncSession = Depends(get_db)):
    pkg = Packaging(
        name=pkg_in.name,
        cost=pkg_in.cost,
        type=pkg_in.type
    )
    db.add(pkg)
    await db.commit()
    await db.refresh(pkg)
    return pkg

@router.delete("/packaging/{pkg_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_packaging(pkg_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Packaging).where(Packaging.id == pkg_id))
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="Packaging item not found")
    await db.delete(pkg)
    await db.commit()
    return None

# --- Operational Costs Endpoints ---
@router.get("/operational", response_model=List[OperationalCostResponse])
async def get_operational_costs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(OperationalCost))
    return result.scalars().all()

@router.post("/operational", response_model=OperationalCostResponse, status_code=status.HTTP_201_CREATED)
async def create_operational_cost(oc_in: OperationalCostCreate, db: AsyncSession = Depends(get_db)):
    oc = OperationalCost(
        name=oc_in.name,
        amount=oc_in.amount,
        type=oc_in.type
    )
    db.add(oc)
    await db.commit()
    await db.refresh(oc)
    return oc

@router.delete("/operational/{oc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_operational_cost(oc_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(OperationalCost).where(OperationalCost.id == oc_id))
    oc = result.scalar_one_or_none()
    if not oc:
        raise HTTPException(status_code=404, detail="Operational cost not found")
    await db.delete(oc)
    await db.commit()
    return None
