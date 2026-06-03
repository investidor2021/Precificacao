from fastapi import APIRouter, HTTPException, status
from typing import List

from app.schemas.schemas import KitCreate, KitResponse
from app.services.sheets import sheets_db
from app.services.pricing import get_loaded_unit_cost

router = APIRouter()

@router.get("/", response_model=List[KitResponse])
async def get_kits():
    try:
        kits = sheets_db.get_kits()
        for k in kits:
            k["unit_cost"] = await get_loaded_unit_cost(sheets_db, k)
        return kits
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter kits: {e}")

@router.post("/", response_model=KitResponse, status_code=status.HTTP_201_CREATED)
async def create_kit(kit_in: KitCreate):
    try:
        # Check duplicate SKU
        existing = sheets_db.get_kit_by_sku(kit_in.sku)
        if existing:
            raise HTTPException(status_code=400, detail="SKU de Kit já existe")
            
        kit_dict = {
            "sku": kit_in.sku,
            "name": kit_in.name,
            "category": kit_in.category or "",
            "weight": kit_in.weight,
            "height": kit_in.height,
            "width": kit_in.width,
            "length": kit_in.length,
            "items": [item.dict() for item in kit_in.items]
        }
        
        # Save kit to sheets
        res = sheets_db.create_kit(kit_dict)
        res["unit_cost"] = await get_loaded_unit_cost(sheets_db, res)
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{kit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kit(kit_id: int):
    try:
        deleted = sheets_db.delete_kit(kit_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Kit não encontrado")
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
