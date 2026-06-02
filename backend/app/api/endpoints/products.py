from fastapi import APIRouter, HTTPException, status
from typing import List

from app.schemas.schemas import ProductCreate, ProductUpdate, ProductResponse
from app.services.sheets import sheets_db
from app.services.pricing import calculate_cubic_weight, get_loaded_unit_cost

router = APIRouter()

@router.get("/", response_model=List[ProductResponse])
async def get_products():
    try:
        products = sheets_db.get_products()
        # Dynamically calculate unit cost on retrieval
        for p in products:
            p["unit_cost"] = await get_loaded_unit_cost(sheets_db, p)
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao acessar a planilha: {e}")

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int):
    try:
        product = sheets_db.get_product(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        product["unit_cost"] = await get_loaded_unit_cost(sheets_db, product)
        return product
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(product_in: ProductCreate):
    try:
        # Check duplicate SKU
        existing = sheets_db.get_product_by_sku(product_in.sku)
        if existing:
            raise HTTPException(status_code=400, detail="SKU already exists")
            
        cubic = await calculate_cubic_weight(product_in.height, product_in.width, product_in.length)
        
        product_dict = {
            "sku": product_in.sku,
            "name": product_in.name,
            "category": product_in.category or "",
            "purchase_cost": product_in.purchase_cost,
            "quantity_acquired": product_in.quantity_acquired,
            "weight": product_in.weight,
            "height": product_in.height,
            "width": product_in.width,
            "length": product_in.length,
            "cubic_weight": cubic,
            "unit_cost": 0.0 # temp placeholder
        }
        
        # Calculate loaded unit cost
        unit_cost = await get_loaded_unit_cost(sheets_db, product_dict)
        product_dict["unit_cost"] = unit_cost
        
        res = sheets_db.create_product(product_dict)
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, product_in: ProductUpdate):
    try:
        product = sheets_db.get_product(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
        # Extract fields to update
        update_data = product_in.dict(exclude_unset=True)
        
        # Calculate new dimensions and weights if provided
        height = update_data.get("height", product["height"])
        width = update_data.get("width", product["width"])
        length = update_data.get("length", product["length"])
        
        update_data["cubic_weight"] = await calculate_cubic_weight(height, width, length)
        
        # Temporary merge for unit cost calculation
        temp_prod = {**product, **update_data}
        update_data["unit_cost"] = await get_loaded_unit_cost(sheets_db, temp_prod)
        
        res = sheets_db.update_product(product_id, update_data)
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int):
    try:
        deleted = sheets_db.delete_product(product_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Product not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
