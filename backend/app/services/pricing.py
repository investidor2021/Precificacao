from sqlalchemy.future import select
from app.models.models import (
    Product, Packaging, OperationalCost, MercadoLivreConfig, 
    ShopeeConfig, MercadoLivreShippingFee
)
from app.schemas.schemas import SimulatorRequest, SimulatorResult

async def calculate_cubic_weight(height: float, width: float, length: float) -> float:
    # Cubic weight formula: (H * W * L) / 6000
    if height <= 0 or width <= 0 or length <= 0:
        return 0.0
    return round((height * width * length) / 6000.0, 3)

async def get_loaded_unit_cost(db, product: Product) -> float:
    # Sum all packaging costs
    packaging_result = await db.execute(select(Packaging))
    packagings = packaging_result.scalars().all()
    total_packaging_cost = sum(pkg.cost for pkg in packagings)
    
    # Sum all operational costs
    op_cost_result = await db.execute(select(OperationalCost))
    op_costs = op_cost_result.scalars().all()
    
    fixed_operational_monthly = sum(oc.amount for oc in op_costs if oc.type == "fixed")
    variable_operational_unit = sum(oc.amount for oc in op_costs if oc.type == "variable")
    
    # Allocate fixed operational costs over a target sales volume (default: 1000 items)
    target_monthly_sales = 1000
    fixed_allocation = fixed_operational_monthly / target_monthly_sales if target_monthly_sales > 0 else 0.0
    
    # Fully loaded cost
    loaded_cost = product.purchase_cost + total_packaging_cost + fixed_allocation + variable_operational_unit
    return round(loaded_cost, 2)

async def get_ml_shipping_cost(db, weight: float, height: float, width: float, length: float, ml_config: MercadoLivreConfig) -> float:
    cubic = await calculate_cubic_weight(height, width, length)
    effective_weight = max(weight, cubic)
    
    # Query shipping fee bracket
    result = await db.execute(select(MercadoLivreShippingFee))
    shipping_fees = result.scalars().all()
    
    # Match correct range
    matched_fee = 0.0
    for bracket in shipping_fees:
        if bracket.weight_min <= effective_weight <= bracket.weight_max:
            matched_fee = bracket.fee
            break
            
    if matched_fee == 0.0:
        # Default fallback shipping if no brackets matched or table is empty
        if effective_weight <= 0.5:
            matched_fee = 19.90
        elif effective_weight <= 1.0:
            matched_fee = 22.90
        elif effective_weight <= 2.0:
            matched_fee = 24.90
        elif effective_weight <= 5.0:
            matched_fee = 29.90
        elif effective_weight <= 9.0:
            matched_fee = 39.90
        else:
            matched_fee = 59.90
            
    # Apply subsidy discount (e.g. 50%)
    discount = ml_config.shipping_subsidy_rate / 100.0
    return round(matched_fee * (1.0 - discount), 2)

async def simulate_pricing_engine(db, request: SimulatorRequest) -> SimulatorResult:
    # 1. Fetch Product
    product_result = await db.execute(select(Product).where(Product.id == request.product_id))
    product = product_result.scalar_one_or_none()
    if not product:
        raise ValueError("Product not found")
        
    unit_cost = await get_loaded_unit_cost(db, product)
    
    # 2. Check Marketplace
    if request.marketplace.startswith("mercado_livre"):
        # Fetch ML Config
        ml_cfg_result = await db.execute(select(MercadoLivreConfig))
        ml_config = ml_cfg_result.scalar_one_or_none()
        if not ml_config:
            ml_config = MercadoLivreConfig()  # Use default values
            
        commission_rate = (
            ml_config.premium_commission_rate if "premium" in request.marketplace 
            else ml_config.classic_commission_rate
        )
        
        r_comm = commission_rate / 100.0
        r_tax = ml_config.tax_rate / 100.0
        fixed_fee_threshold = ml_config.fixed_fee_threshold
        fixed_fee = ml_config.fixed_fee
        
        # Calculate shipping cost for seller if >= 79, or if override provided
        subsidized_shipping = await get_ml_shipping_cost(db, product.weight, product.height, product.width, product.length, ml_config)
        
        if request.shipping_override is not None:
            shipping_cost_over = request.shipping_override
            shipping_cost_under = request.shipping_override
        else:
            shipping_cost_over = subsidized_shipping
            shipping_cost_under = 0.0 # Under 79, buyer pays by default
            
        # Helper to compute net profit, margin, roi given a price
        def eval_ml_price(p: float):
            p = max(p, 0.01)
            # Decide if under or over threshold
            if p < fixed_fee_threshold:
                fee = (p * r_comm) + fixed_fee
                ship = shipping_cost_under
            else:
                fee = p * r_comm
                ship = shipping_cost_over
                
            tax = p * r_tax
            profit = p - unit_cost - fee - ship - tax
            margin = (profit / p) * 100.0 if p > 0 else 0.0
            roi = (profit / unit_cost) * 100.0 if unit_cost > 0 else 0.0
            markup = p / unit_cost if unit_cost > 0 else 0.0
            return p, profit, margin, roi, markup, fee, ship, tax
            
        # Helper to calculate breakeven
        def find_ml_breakeven():
            # Try Region 1: Price < threshold (under R$ 79)
            denom1 = 1.0 - r_comm - r_tax
            p1 = (unit_cost + fixed_fee + shipping_cost_under) / denom1 if denom1 > 0 else 0.0
            if p1 < fixed_fee_threshold:
                return round(p1, 2)
            # Try Region 2: Price >= threshold (over R$ 79)
            denom2 = 1.0 - r_comm - r_tax
            p2 = (unit_cost + shipping_cost_over) / denom2 if denom2 > 0 else 0.0
            return round(max(p2, fixed_fee_threshold), 2)
            
        breakeven_price = find_ml_breakeven()
        
        # Calculate price based on mode
        calculated_price = 0.0
        if request.mode == 1:
            calculated_price = request.input_value
        elif request.mode == 2:
            # Mode 2: Given Target Margin % (e.g. input_value = 20 for 20%)
            m = request.input_value / 100.0
            # Solve for Region 1: p < 79
            denom1 = 1.0 - r_comm - r_tax - m
            p1 = (unit_cost + fixed_fee + shipping_cost_under) / denom1 if denom1 > 0 else 0.0
            if p1 < fixed_fee_threshold:
                calculated_price = p1
            else:
                denom2 = 1.0 - r_comm - r_tax - m
                p2 = (unit_cost + shipping_cost_over) / denom2 if denom2 > 0 else 0.0
                calculated_price = max(p2, fixed_fee_threshold)
        elif request.mode == 3:
            # Mode 3: Given Target Profit in R$
            l_rs = request.input_value
            # Solve for Region 1: p < 79
            denom1 = 1.0 - r_comm - r_tax
            p1 = (unit_cost + fixed_fee + shipping_cost_under + l_rs) / denom1 if denom1 > 0 else 0.0
            if p1 < fixed_fee_threshold:
                calculated_price = p1
            else:
                denom2 = 1.0 - r_comm - r_tax
                p2 = (unit_cost + shipping_cost_over + l_rs) / denom2 if denom2 > 0 else 0.0
                calculated_price = max(p2, fixed_fee_threshold)
                
        calculated_price = round(calculated_price, 2)
        price, net_profit, margin, roi, markup, fees, shipping, tax = eval_ml_price(calculated_price)
        
        return SimulatorResult(
            price=price,
            net_profit=round(net_profit, 2),
            margin=round(margin, 2),
            roi=round(roi, 2),
            markup=round(markup, 2),
            breakeven_price=breakeven_price,
            marketplace_fees=round(fees, 2),
            shipping_cost=round(shipping, 2),
            tax_cost=round(tax, 2),
            unit_cost=round(unit_cost, 2)
        )
        
    elif request.marketplace == "shopee":
        # Fetch Shopee Config
        shopee_cfg_result = await db.execute(select(ShopeeConfig))
        shopee_config = shopee_cfg_result.scalar_one_or_none()
        if not shopee_config:
            shopee_config = ShopeeConfig()
            
        r_comm = shopee_config.commission_rate / 100.0
        r_service = (shopee_config.service_fee_rate / 100.0) if shopee_config.has_free_shipping_program else 0.0
        r_trans = shopee_config.transaction_fee_rate / 100.0
        r_tax = shopee_config.tax_rate / 100.0
        
        # In Shopee, shipping is paid by buyer by default
        shipping_cost = request.shipping_override if request.shipping_override is not None else 0.0
        
        # Total variable percentage
        total_rate = r_comm + r_service + r_trans + r_tax
        
        # Helper to compute metrics
        def eval_shopee_price(p: float):
            p = max(p, 0.01)
            # In Brazil, Shopee base commission + service fee is capped at R$ 100 per item
            # Let's apply standard cap: commission + service fee cap = 100
            # Commission amount
            base_fee = p * (r_comm + r_service)
            if base_fee > 100.0:
                base_fee = 100.0
            trans_fee = p * r_trans
            fees = base_fee + trans_fee
            tax = p * r_tax
            profit = p - unit_cost - fees - shipping_cost - tax
            margin = (profit / p) * 100.0 if p > 0 else 0.0
            roi = (profit / unit_cost) * 100.0 if unit_cost > 0 else 0.0
            markup = p / unit_cost if unit_cost > 0 else 0.0
            return p, profit, margin, roi, markup, fees, shipping_cost, tax
            
        # Solves for Price
        calculated_price = 0.0
        if request.mode == 1:
            calculated_price = request.input_value
        elif request.mode == 2:
            m = request.input_value / 100.0
            denom = 1.0 - total_rate - m
            if denom > 0:
                # Test first if the cap is reached
                # Without cap:
                p_nocap = (unit_cost + shipping_cost) / denom
                # If commission at p_nocap is capped, the formula becomes:
                # p = unit_cost + 100 + p * r_trans + shipping_cost + p * r_tax + p * m
                # p * (1 - r_trans - r_tax - m) = unit_cost + 100 + shipping_cost
                if (p_nocap * (r_comm + r_service)) > 100.0:
                    denom_cap = 1.0 - r_trans - r_tax - m
                    calculated_price = (unit_cost + 100.0 + shipping_cost) / denom_cap if denom_cap > 0 else p_nocap
                else:
                    calculated_price = p_nocap
            else:
                calculated_price = 0.0
        elif request.mode == 3:
            l_rs = request.input_value
            denom = 1.0 - total_rate
            if denom > 0:
                p_nocap = (unit_cost + shipping_cost + l_rs) / denom
                if (p_nocap * (r_comm + r_service)) > 100.0:
                    denom_cap = 1.0 - r_trans - r_tax
                    calculated_price = (unit_cost + 100.0 + shipping_cost + l_rs) / denom_cap if denom_cap > 0 else p_nocap
                else:
                    calculated_price = p_nocap
            else:
                calculated_price = 0.0
                
        # Calculate breakeven
        denom_be = 1.0 - total_rate
        be_nocap = (unit_cost + shipping_cost) / denom_be if denom_be > 0 else 0.0
        if (be_nocap * (r_comm + r_service)) > 100.0:
            denom_cap = 1.0 - r_trans - r_tax
            breakeven_price = (unit_cost + 100.0 + shipping_cost) / denom_cap if denom_cap > 0 else be_nocap
        else:
            breakeven_price = be_nocap
            
        calculated_price = round(calculated_price, 2)
        price, net_profit, margin, roi, markup, fees, shipping, tax = eval_shopee_price(calculated_price)
        
        return SimulatorResult(
            price=price,
            net_profit=round(net_profit, 2),
            margin=round(margin, 2),
            roi=round(roi, 2),
            markup=round(markup, 2),
            breakeven_price=round(breakeven_price, 2),
            marketplace_fees=round(fees, 2),
            shipping_cost=round(shipping, 2),
            tax_cost=round(tax, 2),
            unit_cost=round(unit_cost, 2)
        )
        
    else:
        raise ValueError("Invalid marketplace")
