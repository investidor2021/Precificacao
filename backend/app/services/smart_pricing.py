from sqlalchemy.future import select
from typing import List, Optional
from app.models.models import Product, MercadoLivreConfig
from app.services.pricing import get_loaded_unit_cost, get_ml_shipping_cost
from app.schemas.schemas import SmartPricingRequest, SmartPricingResponse, SmartPricingTier

async def calculate_smart_pricing(db, request: SmartPricingRequest) -> SmartPricingResponse:
    # 1. Determine unit cost
    unit_cost = 0.0
    weight = 0.0
    height = 0.0
    width = 0.0
    length = 0.0
    
    if request.product_id:
        product_result = await db.execute(select(Product).where(Product.id == request.product_id))
        product = product_result.scalar_one_or_none()
        if product:
            unit_cost = await get_loaded_unit_cost(db, product)
            weight = product.weight
            height = product.height
            width = product.width
            length = product.length
    
    if request.custom_cost is not None:
        unit_cost = request.custom_cost

    if unit_cost <= 0:
        unit_cost = 10.0 # fallback default unit cost
        
    # 2. Retrieve standard ML config for baseline fee structure
    ml_cfg_result = await db.execute(select(MercadoLivreConfig))
    ml_config = ml_cfg_result.scalar_one_or_none()
    if not ml_config:
        ml_config = MercadoLivreConfig()
        
    r_comm = ml_config.classic_commission_rate / 100.0
    r_tax = ml_config.tax_rate / 100.0
    fixed_fee_threshold = ml_config.fixed_fee_threshold
    fixed_fee = ml_config.fixed_fee
    
    # Calculate shipping baseline
    shipping_cost = 0.0
    if request.product_id:
        shipping_cost = await get_ml_shipping_cost(db, weight, height, width, length, ml_config)
    else:
        # standard package shipping fallback
        shipping_cost = 10.0
        
    # Helper to calculate price based on target margin
    def solve_price_for_margin(target_margin: float) -> float:
        # Solve Region 1: p < 79 (has fixed fee, no shipping)
        denom1 = 1.0 - r_comm - r_tax - target_margin
        p1 = (unit_cost + fixed_fee + 0.0) / denom1 if denom1 > 0 else 0.0
        if p1 < fixed_fee_threshold:
            return round(p1, 2)
        # Solve Region 2: p >= 79 (no fixed fee, has shipping)
        denom2 = 1.0 - r_comm - r_tax - target_margin
        p2 = (unit_cost + shipping_cost) / denom2 if denom2 > 0 else 0.0
        return round(max(p2, fixed_fee_threshold), 2)
        
    # Helper to evaluate metrics for a pricing suggestion
    def evaluate_price(p: float):
        p = max(p, 0.01)
        if p < fixed_fee_threshold:
            fee = (p * r_comm) + fixed_fee
            ship = 0.0
        else:
            fee = p * r_comm
            ship = shipping_cost
            
        tax = p * r_tax
        profit = p - unit_cost - fee - ship - tax
        margin = (profit / p) * 100.0 if p > 0 else 0.0
        roi = (profit / unit_cost) * 100.0 if unit_cost > 0 else 0.0
        return round(p, 2), round(profit, 2), round(margin, 2), round(roi, 2)

    # 3. Calculate Strategies
    
    # Strategy 1: Preço Mínimo (5% Margin)
    p_min, prof_min, marg_min, roi_min = evaluate_price(solve_price_for_margin(0.05))
    
    # Strategy 2: Preço Ideal
    competitors = [c for c in request.competitors if c > 0]
    if competitors:
        comp_avg = sum(competitors) / len(competitors)
        # Check margin at competitor average
        _, p_avg_profit, p_avg_margin_pct, _ = evaluate_price(comp_avg)
        p_avg_margin = p_avg_margin_pct / 100.0
        
        if p_avg_margin < 0.15:
            # Force 15% margin if competitor average is too low
            p_ideal_val = solve_price_for_margin(0.15)
        elif p_avg_margin > 0.35:
            # Force 30% margin if competitor average is extremely high (keep competitive)
            p_ideal_val = solve_price_for_margin(0.30)
        else:
            p_ideal_val = comp_avg
    else:
        p_ideal_val = solve_price_for_margin(0.25) # 25% target margin default
        
    p_ideal, prof_ideal, marg_ideal, roi_ideal = evaluate_price(p_ideal_val)
    
    # Strategy 3: Preço Agressivo
    if competitors:
        comp_min = min(competitors)
        # Target 10 cents below lowest competitor
        p_aggr_val = max(p_min, comp_min - 0.10)
    else:
        p_aggr_val = solve_price_for_margin(0.12) # 12% target margin default
        
    p_aggr, prof_aggr, marg_aggr, roi_aggr = evaluate_price(p_aggr_val)
    
    # Assemble Response Tiers
    tiers = [
        SmartPricingTier(
            strategy="Mínimo",
            price=p_min,
            profit=prof_min,
            margin=marg_min,
            roi=roi_min,
            description="Preço defensivo para cobrir custos e garantir margem mínima de segurança (5%)."
        ),
        SmartPricingTier(
            strategy="Ideal",
            price=p_ideal,
            profit=prof_ideal,
            margin=marg_ideal,
            roi=roi_ideal,
            description="Preço otimizado baseado no comportamento de mercado (concorrência) e margem saudável."
        ),
        SmartPricingTier(
            strategy="Agressivo",
            price=p_aggr,
            profit=prof_aggr,
            margin=marg_aggr,
            roi=roi_aggr,
            description="Preço de combate para destacar nos rankings de busca e ganhar a Buybox."
        )
    ]
    
    return SmartPricingResponse(tiers=tiers)
