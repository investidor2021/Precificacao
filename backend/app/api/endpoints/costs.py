from fastapi import APIRouter, HTTPException, status
from typing import List

from app.schemas.schemas import (
    PackagingCreate, PackagingResponse, PackagingUpdate,
    OperationalCostCreate, OperationalCostResponse
)
from app.services.sheets import sheets_db

router = APIRouter()

# --- Packaging ---
@router.get("/packaging", response_model=List[PackagingResponse])
async def get_packagings():
    try:
        return sheets_db.get_packaging()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/packaging", response_model=PackagingResponse, status_code=status.HTTP_201_CREATED)
async def create_packaging(pkg_in: PackagingCreate):
    try:
        pkg_dict = {
            "name": pkg_in.name,
            "cost": pkg_in.cost,
            "type": pkg_in.type
        }
        return sheets_db.create_packaging(pkg_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/packaging/{pkg_id}", response_model=PackagingResponse)
async def update_packaging(pkg_id: int, pkg_in: PackagingUpdate):
    try:
        existing = sheets_db.get_packaging()
        found = any(safe_int(p["id"]) == pkg_id for p in existing)
        if not found:
            raise HTTPException(status_code=404, detail="Packaging item not found")
            
        update_data = pkg_in.dict(exclude_unset=True)
        res = sheets_db.update_packaging(pkg_id, update_data)
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper to cast safe_int
def safe_int(val):
    try:
        return int(float(str(val)))
    except (ValueError, TypeError):
        return 0

@router.delete("/packaging/{pkg_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_packaging(pkg_id: int):
    try:
        deleted = sheets_db.delete_packaging(pkg_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Packaging item not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Operational Costs ---
@router.get("/operational", response_model=List[OperationalCostResponse])
async def get_operational_costs():
    try:
        return sheets_db.get_operational_costs()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/operational", response_model=OperationalCostResponse, status_code=status.HTTP_201_CREATED)
async def create_operational_cost(oc_in: OperationalCostCreate):
    try:
        op_dict = {
            "name": oc_in.name,
            "amount": oc_in.amount,
            "type": oc_in.type
        }
        return sheets_db.create_operational_cost(op_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/operational/{oc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_operational_cost(oc_id: int):
    try:
        deleted = sheets_db.delete_operational_cost(oc_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Operational cost not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
