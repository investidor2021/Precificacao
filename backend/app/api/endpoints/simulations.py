from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Product, Simulation
from app.schemas.schemas import (
    SimulatorRequest, SimulatorResult, 
    ComparatorRequest, ComparatorResponse, MarketplaceComparisonDetails,
    SmartPricingRequest, SmartPricingResponse, SimulationResponse
)
from app.services.pricing import simulate_pricing_engine, get_loaded_unit_cost
from app.services.smart_pricing import calculate_smart_pricing

router = APIRouter()

class ExtendedComparatorRequest(BaseModel):
    product_id: int
    reference_price: Optional[float] = None
    shipping_override: Optional[float] = None

@router.post("/simulate", response_model=SimulatorResult)
async def simulate_price(request: SimulatorRequest, db: AsyncSession = Depends(get_db)):
    try:
        # Run pricing engine
        result = await simulate_pricing_engine(db, request)
        
        # Log simulation to database
        product_result = await db.execute(select(Product).where(Product.id == request.product_id))
        product = product_result.scalar_one_or_none()
        
        sim_log = Simulation(
            product_id=request.product_id,
            product_sku=product.sku if product else None,
            product_name=product.name if product else None,
            marketplace=request.marketplace,
            mode=request.mode,
            input_value=request.input_value,
            calculated_price=result.price,
            calculated_profit=result.net_profit,
            calculated_margin=result.margin,
            calculated_roi=result.roi,
            calculated_fees=result.marketplace_fees,
            calculated_shipping=result.shipping_cost
        )
        db.add(sim_log)
        await db.commit()
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history", response_model=List[SimulationResponse])
async def get_simulation_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Simulation).order_by(Simulation.created_at.desc()).limit(50))
    return result.scalars().all()

@router.post("/compare", response_model=ComparatorResponse)
async def compare_marketplaces(request: ExtendedComparatorRequest, db: AsyncSession = Depends(get_db)):
    product_result = await db.execute(select(Product).where(Product.id == request.product_id))
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    unit_cost = await get_loaded_unit_cost(db, product)
    
    # Determine reference selling price for comparison
    ref_price = request.reference_price
    if not ref_price or ref_price <= 0:
        # Default: 1.5x of fully loaded cost or R$ 100 minimum
        ref_price = max(unit_cost * 1.5, 100.0)
        
    # Standardize to 2 decimals
    ref_price = round(ref_price, 2)
    
    marketplaces = [
        {"name": "Mercado Livre Clássico", "key": "mercado_livre_classic"},
        {"name": "Mercado Livre Premium", "key": "mercado_livre_premium"},
        {"name": "Shopee", "key": "shopee"}
    ]
    
    comparison_details = []
    best_profit = -999999.0
    best_mp = ""
    
    for mp in marketplaces:
        sim_req = SimulatorRequest(
            product_id=product.id,
            marketplace=mp["key"],
            mode=1, # Mode 1: Price given
            input_value=ref_price,
            shipping_override=request.shipping_override
        )
        
        try:
            res = await simulate_pricing_engine(db, sim_req)
            detail = MarketplaceComparisonDetails(
                marketplace_name=mp["name"],
                price=res.price,
                fees=res.marketplace_fees,
                shipping=res.shipping_cost,
                tax=res.tax_cost,
                profit=res.net_profit,
                margin=res.margin,
                roi=res.roi
            )
            comparison_details.append(detail)
            
            # Identify most profitable marketplace
            if res.net_profit > best_profit:
                best_profit = res.net_profit
                best_mp = mp["name"]
        except Exception:
            continue
            
    return ComparatorResponse(
        product_name=product.name,
        sku=product.sku,
        unit_cost=unit_cost,
        comparisons=comparison_details,
        best_marketplace=best_mp
    )

@router.post("/smart-pricing", response_model=SmartPricingResponse)
async def get_smart_pricing_recommendations(request: SmartPricingRequest, db: AsyncSession = Depends(get_db)):
    try:
        res = await calculate_smart_pricing(db, request)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
