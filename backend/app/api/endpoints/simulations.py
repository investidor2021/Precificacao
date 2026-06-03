from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel

from app.schemas.schemas import (
    SimulatorRequest, SimulatorResult, 
    ComparatorResponse, MarketplaceComparisonDetails,
    SmartPricingRequest, SmartPricingResponse, SimulationResponse
)
from app.services.sheets import sheets_db
from app.services.pricing import simulate_pricing_engine, get_loaded_unit_cost
from app.services.smart_pricing import calculate_smart_pricing

router = APIRouter()

class ExtendedComparatorRequest(BaseModel):
    product_id: int
    reference_price: Optional[float] = None
    shipping_override: Optional[float] = None
    is_kit: Optional[bool] = False

@router.post("/simulate", response_model=SimulatorResult)
async def simulate_price(request: SimulatorRequest):
    try:
        # Run solver pricing engine
        result = await simulate_pricing_engine(sheets_db, request)
        
        # Log simulation to sheets
        if getattr(request, "is_kit", False):
            product = sheets_db.get_kit(request.product_id)
        else:
            product = sheets_db.get_product(request.product_id)
        
        sim_dict = {
            "product_sku": product["sku"] if product else "CUSTOM",
            "product_name": product["name"] if product else "CUSTOM",
            "marketplace": request.marketplace,
            "mode": request.mode,
            "input_value": request.input_value,
            "calculated_price": result.price,
            "calculated_profit": result.net_profit,
            "calculated_margin": result.margin,
            "calculated_roi": result.roi,
            "calculated_fees": result.marketplace_fees,
            "calculated_shipping": result.shipping_cost
        }
        sheets_db.create_simulation(sim_dict)
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history", response_model=List[SimulationResponse])
async def get_simulation_history():
    try:
        history = sheets_db.get_simulations()
        # Sort and limit top 50 in memory
        history.sort(key=lambda x: x["created_at"], reverse=True)
        return history[:50]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare", response_model=ComparatorResponse)
async def compare_marketplaces(request: ExtendedComparatorRequest):
    if getattr(request, "is_kit", False):
        product = sheets_db.get_kit(request.product_id)
    else:
        product = sheets_db.get_product(request.product_id)
        
    if not product:
        raise HTTPException(status_code=404, detail="Product or Kit not found")
        
    unit_cost = await get_loaded_unit_cost(sheets_db, product)
    
    ref_price = request.reference_price
    if not ref_price or ref_price <= 0:
        ref_price = max(unit_cost * 1.5, 100.0)
        
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
            product_id=product["id"],
            marketplace=mp["key"],
            mode=1,
            input_value=ref_price,
            shipping_override=request.shipping_override,
            is_kit=getattr(request, "is_kit", False)
        )
        
        try:
            res = await simulate_pricing_engine(sheets_db, sim_req)
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
            
            if res.net_profit > best_profit:
                best_profit = res.net_profit
                best_mp = mp["name"]
        except Exception:
            continue
            
    return ComparatorResponse(
        product_name=product["name"],
        sku=product["sku"],
        unit_cost=unit_cost,
        comparisons=comparison_details,
        best_marketplace=best_mp
    )

@router.post("/smart-pricing", response_model=SmartPricingResponse)
async def get_smart_pricing_recommendations(request: SmartPricingRequest):
    try:
        res = await calculate_smart_pricing(sheets_db, request)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
Prefix = ""
