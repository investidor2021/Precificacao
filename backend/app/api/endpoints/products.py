from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.models.models import Product, Supplier
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductResponse
from app.services.pricing import calculate_cubic_weight, get_loaded_unit_cost

router = APIRouter()

@router.get("/", response_model=List[ProductResponse])
async def get_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product))
    products = result.scalars().all()
    # Dynamically update unit_cost before returning
    for product in products:
        product.unit_cost = await get_loaded_unit_cost(db, product)
    return products

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.unit_cost = await get_loaded_unit_cost(db, product)
    return product

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(product_in: ProductCreate, db: AsyncSession = Depends(get_db)):
    # Check duplicate SKU
    sku_check = await db.execute(select(Product).where(Product.sku == product_in.sku))
    if sku_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="SKU already exists")
        
    # Check supplier if provided
    if product_in.supplier_id:
        sup_check = await db.execute(select(Supplier).where(Supplier.id == product_in.supplier_id))
        if not sup_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Supplier not found")
            
    # Calculate cubic weight
    cubic = await calculate_cubic_weight(product_in.height, product_in.width, product_in.length)
    
    product = Product(
        sku=product_in.sku,
        name=product_in.name,
        category=product_in.category,
        supplier_id=product_in.supplier_id,
        purchase_cost=product_in.purchase_cost,
        quantity_acquired=product_in.quantity_acquired,
        weight=product_in.weight,
        height=product_in.height,
        width=product_in.width,
        length=product_in.length,
        cubic_weight=cubic
    )
    
    db.add(product)
    await db.flush() # Populate ID
    
    # Calculate fully loaded unit cost
    product.unit_cost = await get_loaded_unit_cost(db, product)
    await db.commit()
    await db.refresh(product)
    return product

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, product_in: ProductUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Check duplicate SKU if changed
    if product_in.sku and product_in.sku != product.sku:
        sku_check = await db.execute(select(Product).where(Product.sku == product_in.sku))
        if sku_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="SKU already exists")
            
    # Update fields
    for field, value in product_in.dict(exclude_unset=True).items():
        setattr(product, field, value)
        
    # Recalculate cubic weight
    product.cubic_weight = await calculate_cubic_weight(product.height, product.width, product.length)
    
    # Recalculate loaded cost
    product.unit_cost = await get_loaded_unit_cost(db, product)
    
    await db.commit()
    await db.refresh(product)
    return product

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.commit()
    return None
