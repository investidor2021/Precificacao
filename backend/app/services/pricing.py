from typing import Dict, Any
from app.schemas.schemas import SimulatorRequest, SimulatorResult

async def calculate_cubic_weight(height: float, width: float, length: float) -> float:
    # Cubic weight formula: (H * W * L) / 6000
    if height <= 0 or width <= 0 or length <= 0:
        return 0.0
    return round((height * width * length) / 6000.0, 3)

async def get_loaded_unit_cost(sheets_db, product: Dict[str, Any]) -> float:
    # Fetch packaging from sheets
    packagings = sheets_db.get_packaging()
    total_packaging_cost = sum(pkg["cost"] for pkg in packagings)
    
    # Fetch operational costs from sheets
    op_costs = sheets_db.get_operational_costs()
    
    fixed_operational_monthly = sum(oc["amount"] for oc in op_costs if oc["type"] == "fixed")
    variable_operational_unit = sum(oc["amount"] for oc in op_costs if oc["type"] == "variable")
    
    # Allocate fixed costs (e.g. over a baseline 1000 items/month)
    target_monthly_sales = 1000
    fixed_allocation = fixed_operational_monthly / target_monthly_sales if target_monthly_sales > 0 else 0.0
    
    loaded_cost = product["purchase_cost"] + total_packaging_cost + fixed_allocation + variable_operational_unit
    return round(loaded_cost, 2)

async def get_ml_shipping_cost(sheets_db, weight: float, height: float, width: float, length: float, ml_config: Dict[str, Any]) -> float:
    cubic = await calculate_cubic_weight(height, width, length)
    effective_weight = max(weight, cubic)
    
    # Default Brazilian marketplace logistics bracket fees
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
        
    discount = ml_config["shipping_subsidy_rate"] / 100.0
    return round(matched_fee * (1.0 - discount), 2)

async def simulate_pricing_engine(sheets_db, request: SimulatorRequest) -> SimulatorResult:
    # 1. Fetch Product or Kit
    if getattr(request, "is_kit", False):
        product = sheets_db.get_kit(request.product_id)
    else:
        product = sheets_db.get_product(request.product_id)
        
    if not product:
        raise ValueError("Product or Kit not found")
        
    unit_cost = await get_loaded_unit_cost(sheets_db, product)
    
    # 2. Check Marketplace
    if request.marketplace.startswith("mercado_livre"):
        # Fetch ML Config
        ml_config = sheets_db.get_ml_config()
            
        commission_rate = (
            ml_config["premium_commission_rate"] if "premium" in request.marketplace 
            else ml_config["classic_commission_rate"]
        )
        
        r_comm = commission_rate / 100.0
        r_tax = ml_config["tax_rate"] / 100.0
        fixed_fee_threshold = ml_config["fixed_fee_threshold"]
        fixed_fee = ml_config["fixed_fee"]
        
        subsidized_shipping = await get_ml_shipping_cost(sheets_db, product["weight"], product["height"], product["width"], product["length"], ml_config)
        
        if request.shipping_override is not None:
            shipping_cost_over = request.shipping_override
            shipping_cost_under = request.shipping_override
        else:
            shipping_cost_over = subsidized_shipping
            shipping_cost_under = 0.0 # Under 79, buyer pays
            
        def eval_ml_price(p: float):
            p = max(p, 0.01)
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
            
        def find_ml_breakeven():
            # Try Region 1
            denom1 = 1.0 - r_comm - r_tax
            p1 = (unit_cost + fixed_fee + shipping_cost_under) / denom1 if denom1 > 0 else 0.0
            if p1 < fixed_fee_threshold:
                return round(p1, 2)
            # Try Region 2
            denom2 = 1.0 - r_comm - r_tax
            p2 = (unit_cost + shipping_cost_over) / denom2 if denom2 > 0 else 0.0
            return round(max(p2, fixed_fee_threshold), 2)
            
        breakeven_price = find_ml_breakeven()
        
        calculated_price = 0.0
        if request.mode == 1:
            calculated_price = request.input_value
        elif request.mode == 2:
            m = request.input_value / 100.0
            denom1 = 1.0 - r_comm - r_tax - m
            p1 = (unit_cost + fixed_fee + shipping_cost_under) / denom1 if denom1 > 0 else 0.0
            if p1 < fixed_fee_threshold:
                calculated_price = p1
            else:
                denom2 = 1.0 - r_comm - r_tax - m
                p2 = (unit_cost + shipping_cost_over) / denom2 if denom2 > 0 else 0.0
                calculated_price = max(p2, fixed_fee_threshold)
        elif request.mode == 3:
            l_rs = request.input_value
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
        shopee_config = sheets_db.get_shopee_config()
            
        r_comm = shopee_config["commission_rate"] / 100.0
        r_service = (shopee_config["service_fee_rate"] / 100.0) if shopee_config["has_free_shipping_program"] else 0.0
        r_trans = shopee_config["transaction_fee_rate"] / 100.0
        r_tax = shopee_config["tax_rate"] / 100.0
        
        shipping_cost = request.shipping_override if request.shipping_override is not None else 0.0
        total_rate = r_comm + r_service + r_trans + r_tax
        
        def eval_shopee_price(p: float):
            p = max(p, 0.01)
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
            
        calculated_price = 0.0
        if request.mode == 1:
            calculated_price = request.input_value
        elif request.mode == 2:
            m = request.input_value / 100.0
            denom = 1.0 - total_rate - m
            if denom > 0:
                p_nocap = (unit_cost + shipping_cost) / denom
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
