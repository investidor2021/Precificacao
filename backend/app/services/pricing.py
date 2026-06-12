import re
from typing import Dict, Any
from app.schemas.schemas import SimulatorRequest, SimulatorResult

def parse_dimensions_from_name(name: str) -> list:
    # Match patterns like 16x11x6, 16 x 11 x 6, 20x15, 20 x 15, etc.
    match = re.search(r'\d+(?:\.\d+)?\s*[xX\u00d7]\s*\d+(?:\.\d+)?(?:\s*[xX\u00d7]\s*\d+(?:\.\d+)?)?', name.replace(',', '.'))
    if match:
        parts = re.split(r'[xX\u00d7]', match.group(0))
        return [float(p.strip()) for p in parts if p.strip()]
    return []

def select_packaging_item(product: Dict[str, Any], packagings: list, override_id: Any = None) -> Dict[str, Any]:
    containers = []
    accessories = []
    
    for pkg in packagings:
        pkg_type = pkg.get("type", "")
        if pkg_type in ["box", "envelope"]:
            containers.append(pkg)
        else:
            accessories.append(pkg)
            
    selected_container = None
    
    if override_id is not None:
        try:
            target_id = int(float(str(override_id)))
            for c in containers:
                if c.get("id") == target_id:
                    selected_container = c
                    break
        except (ValueError, TypeError):
            pass
                
    if not selected_container and containers:
        h = product.get("height", 0.0)
        w = product.get("width", 0.0)
        l = product.get("length", 0.0)
        p_dims = sorted([h, w, l])
        
        if p_dims[2] > 0:
            fitting_containers = []
            for c in containers:
                dims = parse_dimensions_from_name(c.get("name", ""))
                if not dims:
                    continue
                if c.get("type") == "envelope" and len(dims) == 2:
                    c_dims_sorted = sorted([2.0] + dims)
                else:
                    c_dims_sorted = sorted(dims)
                    while len(c_dims_sorted) < 3:
                        c_dims_sorted.insert(0, 1.0)
                
                if p_dims[0] <= c_dims_sorted[0] and p_dims[1] <= c_dims_sorted[1] and p_dims[2] <= c_dims_sorted[2]:
                    fitting_containers.append(c)
            
            if fitting_containers:
                selected_container = min(fitting_containers, key=lambda x: x["cost"])
            else:
                selected_container = max(containers, key=lambda x: x["cost"])
        else:
            selected_container = min(containers, key=lambda x: x["cost"])
            
    container_cost = selected_container["cost"] if selected_container else 0.0
    accessories_cost = sum(a["cost"] for a in accessories)
    
    return {
        "container": selected_container,
        "total_cost": container_cost + accessories_cost,
        "accessories": accessories
    }

def calculate_packaging_cost(product: Dict[str, Any], packagings: list) -> float:
    return select_packaging_item(product, packagings)["total_cost"]

async def calculate_cubic_weight(height: float, width: float, length: float) -> float:
    # Cubic weight formula: (H * W * L) / 6000
    if height <= 0 or width <= 0 or length <= 0:
        return 0.0
    return round((height * width * length) / 6000.0, 3)

async def get_loaded_unit_cost(sheets_db, product: Dict[str, Any]) -> float:
    # Fetch packaging from sheets
    packagings = sheets_db.get_packaging()
    pkg_res = select_packaging_item(product, packagings)
    total_packaging_cost = pkg_res["total_cost"]
    
    # Fetch operational costs from sheets
    op_costs = sheets_db.get_operational_costs()
    
    fixed_operational_monthly = sum(oc["amount"] for oc in op_costs if oc["type"] == "fixed")
    variable_operational_unit = sum(oc["amount"] for oc in op_costs if oc["type"] == "variable")
    
    # Allocate fixed costs (e.g. over a baseline 1000 items/month)
    target_monthly_sales = 1000
    fixed_allocation = fixed_operational_monthly / target_monthly_sales if target_monthly_sales > 0 else 0.0
    
    loaded_cost = product["purchase_cost"] + total_packaging_cost + fixed_allocation + variable_operational_unit
    return round(loaded_cost, 2)

def get_ml_2026_shipping_fee(reputation: str, weight: float, price: float = 79.0) -> float:
    rep = reputation.lower()
    is_under_threshold = (price < 79.0)
    if rep == "verde":
        if weight <= 0.3: return 5.65 if is_under_threshold else 20.95
        elif weight <= 0.5: return 5.95 if is_under_threshold else 22.55
        elif weight <= 1.0: return 6.05 if is_under_threshold else 23.65
        elif weight <= 1.5: return 6.15 if is_under_threshold else 24.65
        elif weight <= 2.0: return 6.25 if is_under_threshold else 24.65
        elif weight <= 3.0: return 6.35 if is_under_threshold else 26.25
        elif weight <= 4.0: return 6.45 if is_under_threshold else 28.35
        elif weight <= 5.0: return 6.55 if is_under_threshold else 30.75
        elif weight <= 9.0: return 39.75
        elif weight <= 20.0: return 91.15
        elif weight <= 40.0: return 107.05
        elif weight <= 80.0: return 132.25
        elif weight <= 100.0: return 167.95
        elif weight <= 150.0: return 199.45
        else: return 261.95
    elif rep == "amarela":
        if weight <= 0.3: return 6.46 if is_under_threshold else 25.14
        elif weight <= 0.5: return 6.80 if is_under_threshold else 27.06
        elif weight <= 1.0: return 6.91 if is_under_threshold else 28.38
        elif weight <= 2.0: return 29.58
        elif weight <= 5.0: return 36.90
        elif weight <= 9.0: return 59.22
        elif weight <= 20.0: return 109.38
        elif weight <= 40.0: return 128.46
        elif weight <= 80.0: return 176.34
        elif weight <= 100.0: return 201.54
        elif weight <= 150.0: return 239.34
        else: return 314.34
    else:  # vermelha / base
        if weight <= 0.3: return 8.07 if is_under_threshold else 41.90
        elif weight <= 0.5: return 8.50 if is_under_threshold else 45.10
        elif weight <= 1.0: return 8.64 if is_under_threshold else 47.30
        elif weight <= 2.0: return 49.30
        elif weight <= 5.0: return 61.50
        elif weight <= 9.0: return 98.70
        elif weight <= 20.0: return 182.30
        elif weight <= 40.0: return 214.10
        elif weight <= 80.0: return 293.90
        elif weight <= 100.0: return 335.90
        elif weight <= 150.0: return 398.90
        else: return 523.90

async def get_ml_raw_shipping_fee(weight: float, height: float, width: float, length: float) -> float:
    cubic = await calculate_cubic_weight(height, width, length)
    effective_weight = max(weight, cubic)
    return get_ml_2026_shipping_fee("vermelha", effective_weight, price=79.0)

async def get_ml_shipping_cost(sheets_db, weight: float, height: float, width: float, length: float, ml_config: Dict[str, Any]) -> float:
    cubic = await calculate_cubic_weight(height, width, length)
    effective_weight = max(weight, cubic)
    return get_ml_2026_shipping_fee("verde", effective_weight, price=79.0)

async def simulate_pricing_engine(sheets_db, request: SimulatorRequest) -> SimulatorResult:
    # 1. Fetch Product or Kit
    if getattr(request, "is_kit", False):
        product = sheets_db.get_kit(request.product_id)
    else:
        product = sheets_db.get_product(request.product_id)
        
    if not product:
        raise ValueError("Product or Kit not found")
        
    # Calculate detailed cost components
    packagings = sheets_db.get_packaging()
    # Resolve custom packaging if overridden in request
    req_pkg_override = getattr(request, "packaging_override_id", None)
    pkg_res = select_packaging_item(product, packagings, req_pkg_override)
    packaging_cost = pkg_res["total_cost"]
    selected_pkg = pkg_res["container"]
    
    op_costs = sheets_db.get_operational_costs()
    fixed_operational_monthly = sum(oc["amount"] for oc in op_costs if oc["type"] == "fixed")
    variable_operational_cost = sum(oc["amount"] for oc in op_costs if oc["type"] == "variable")
    
    target_monthly_sales = 1000
    fixed_operational_cost = fixed_operational_monthly / target_monthly_sales if target_monthly_sales > 0 else 0.0
    
    purchase_cost = product["purchase_cost"]
    
    purchase_cost_rounded = round(purchase_cost, 2)
    packaging_cost_rounded = round(packaging_cost, 2)
    fixed_operational_cost_rounded = round(fixed_operational_cost, 2)
    variable_operational_cost_rounded = round(variable_operational_cost, 2)
    unit_cost = round(purchase_cost_rounded + packaging_cost_rounded + fixed_operational_cost_rounded + variable_operational_cost_rounded, 2)
    
    # 2. Check Marketplace
    if request.marketplace.startswith("mercado_livre"):
        # Fetch ML Config
        ml_config = sheets_db.get_ml_config()
        
        # Resolve category
        req_cat = getattr(request, "category", None)
        if not req_cat:
            req_cat = product.get("category", "")
            
        is_premium = "premium" in request.marketplace
        default_rate = ml_config["premium_commission_rate"] if is_premium else ml_config["classic_commission_rate"]
        
        if req_cat:
            cat_lower = req_cat.lower().strip()
            if any(x in cat_lower for x in ["sapato", "calçado", "calçado", "brinquedo", "bebe", "veiculo", "esporte", "fitness", "ferramenta", "casa", "decoracao", "moveis", "saude"]):
                commission_rate = 16.5 if is_premium else 11.5
            elif any(x in cat_lower for x in ["vestuario", "roupa", "moda", "acessorio", "beleza", "cosmetico", "joia", "relogio", "festa"]):
                commission_rate = 17.5 if is_premium else 12.5
            elif any(x in cat_lower for x in ["eletronico", "celular", "computador", "tecnologia", "game", "console", "eletrodomestico", "agro", "alimento", "bebida", "instrumento"]):
                commission_rate = 15.5 if is_premium else 10.5
            elif any(x in cat_lower for x in ["livro", "revista", "comic", "filme", "musica"]):
                commission_rate = 15.0 if is_premium else 10.0
            else:
                commission_rate = default_rate
        else:
            commission_rate = default_rate
            
        r_comm = commission_rate / 100.0
        r_tax = ml_config["tax_rate"] / 100.0
        fixed_fee_threshold = ml_config["fixed_fee_threshold"]
        
        # Determine reputation and select appropriate fee
        req_rep = getattr(request, "reputation", None)
        if not req_rep:
            reputation_active = getattr(request, "reputation_good", True)
            reputation = "verde" if reputation_active else "amarela"
        else:
            reputation = req_rep.lower()
            if reputation not in ["verde", "amarela", "vermelha"]:
                reputation = "verde"
                
        cubic = await calculate_cubic_weight(product["height"], product["width"], product["length"])
        effective_weight = max(product["weight"], cubic)
        
        raw_fee_bracket_over = get_ml_2026_shipping_fee("vermelha", effective_weight, price=79.0)
        raw_fee_bracket_under = get_ml_2026_shipping_fee("vermelha", effective_weight, price=0.0)
        
        subsidized_shipping_over = get_ml_2026_shipping_fee(reputation, effective_weight, price=79.0)
        subsidized_shipping_under = get_ml_2026_shipping_fee(reputation, effective_weight, price=0.0)
        
        if request.shipping_override is not None:
            shipping_cost_over = request.shipping_override
            shipping_cost_under = request.shipping_override
        else:
            shipping_cost_over = subsidized_shipping_over
            if getattr(request, "free_shipping", False):
                shipping_cost_under = subsidized_shipping_under
            else:
                shipping_cost_under = 0.0 # Under 79, buyer pays
                
        def get_ml_variable_fixed_fee(p: float) -> float:
            if p >= fixed_fee_threshold:
                return 0.0
            if p < 12.50:
                return round(p * 0.50, 2)
            elif p < 29.00:
                return 6.25
            elif p < 50.00:
                return 6.50
            else:
                return 6.75
                
        def eval_ml_price(p: float):
            p = max(p, 0.01)
            cvff = get_ml_variable_fixed_fee(p)
            
            if p < fixed_fee_threshold:
                fee = (p * r_comm) + cvff
                commission_percent_val = p * r_comm
                fixed_fee_val = cvff
                ship = shipping_cost_under
            else:
                fee = p * r_comm
                commission_percent_val = p * r_comm
                fixed_fee_val = 0.0
                ship = shipping_cost_over
                
            tax = p * r_tax
            profit = p - unit_cost - fee - ship - tax
            margin = (profit / p) * 100.0 if p > 0 else 0.0
            roi = (profit / unit_cost) * 100.0 if unit_cost > 0 else 0.0
            markup = p / unit_cost if unit_cost > 0 else 0.0
            
            # Detailed shipping breakdown
            if ship == 0.0:
                raw_shipping_val = 0.0
                shipping_discount_val = 0.0
            else:
                if request.shipping_override is not None:
                    raw_shipping_val = request.shipping_override
                    shipping_discount_val = 0.0
                else:
                    if p < fixed_fee_threshold:
                        raw_shipping_val = raw_fee_bracket_under
                        shipping_discount_val = round(raw_fee_bracket_under - subsidized_shipping_under, 2)
                    else:
                        raw_shipping_val = raw_fee_bracket_over
                        shipping_discount_val = round(raw_fee_bracket_over - subsidized_shipping_over, 2)
                        
            return p, profit, margin, roi, markup, fee, ship, tax, commission_percent_val, fixed_fee_val, raw_shipping_val, shipping_discount_val

        def solve_ml_price(target_margin: float = 0.0, target_profit: float = 0.0) -> float:
            m = target_margin
            tp = target_profit
            
            # Step 1: P < 12.50 (CVFF = P * 0.5)
            denom1 = 1.0 - r_comm - r_tax - m - 0.5
            if denom1 > 0:
                p1 = (unit_cost + shipping_cost_under + tp) / denom1
                if p1 < 12.50:
                    return p1
                    
            # Step 2: 12.50 <= P < 29.00 (CVFF = 6.25)
            denom2 = 1.0 - r_comm - r_tax - m
            if denom2 > 0:
                p2 = (unit_cost + 6.25 + shipping_cost_under + tp) / denom2
                if 12.50 <= p2 < 29.00:
                    return p2
                    
            # Step 3: 29.00 <= P < 50.00 (CVFF = 6.50)
            if denom2 > 0:
                p3 = (unit_cost + 6.50 + shipping_cost_under + tp) / denom2
                if 29.00 <= p3 < 50.00:
                    return p3
                    
            # Step 4: 50.00 <= P < 79.00 (CVFF = 6.75)
            if denom2 > 0:
                p4 = (unit_cost + 6.75 + shipping_cost_under + tp) / denom2
                if 50.00 <= p4 < 79.00:
                    return p4
                    
            # Step 5: P >= 79.00 (CVFF = 0.0)
            if denom2 > 0:
                p5 = (unit_cost + shipping_cost_over + tp) / denom2
                return max(p5, 79.00)
                
            return 79.00
            
        breakeven_price = solve_ml_price()
        
        calculated_price = 0.0
        if request.mode == 1:
            calculated_price = request.input_value
        elif request.mode == 2:
            m = request.input_value / 100.0
            calculated_price = solve_ml_price(target_margin=m)
        elif request.mode == 3:
            l_rs = request.input_value
            calculated_price = solve_ml_price(target_profit=l_rs)
            
        calculated_price = round(calculated_price, 2)
        price, net_profit, margin, roi, markup, fees, shipping, tax, comm_val, fix_val, raw_ship, ship_disc = eval_ml_price(calculated_price)
        
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
            unit_cost=round(unit_cost, 2),
            purchase_cost=purchase_cost_rounded,
            packaging_cost=packaging_cost_rounded,
            fixed_operational_cost=fixed_operational_cost_rounded,
            variable_operational_cost=variable_operational_cost_rounded,
            commission_percent_val=round(comm_val, 2),
            fixed_fee_val=round(fix_val, 2),
            raw_shipping_val=round(raw_ship, 2),
            shipping_discount_val=round(ship_disc, 2),
            selected_packaging_id=selected_pkg.get("id") if selected_pkg else None,
            selected_packaging_name=selected_pkg.get("name", "") if selected_pkg else "",
            tax_rate=ml_config["tax_rate"]
        )
        
    elif request.marketplace == "shopee":
        shopee_config = sheets_db.get_shopee_config()
            
        r_comm = shopee_config["commission_rate"] / 100.0
        r_service = (shopee_config["service_fee_rate"] / 100.0) if shopee_config["has_free_shipping_program"] else 0.0
        r_trans = shopee_config["transaction_fee_rate"] / 100.0
        r_tax = shopee_config["tax_rate"] / 100.0
        fixed_fee = shopee_config.get("fixed_fee", 3.0)
        
        shipping_cost = request.shipping_override if request.shipping_override is not None else 0.0
        total_rate = r_comm + r_service + r_trans + r_tax
        
        def eval_shopee_price(p: float):
            p = max(p, 0.01)
            base_fee = p * (r_comm + r_service)
            if base_fee > 100.0:
                base_fee = 100.0
            trans_fee = p * r_trans
            fees = base_fee + trans_fee + fixed_fee
            tax = p * r_tax
            profit = p - unit_cost - fees - shipping_cost - tax
            margin = (profit / p) * 100.0 if p > 0 else 0.0
            roi = (profit / unit_cost) * 100.0 if unit_cost > 0 else 0.0
            markup = p / unit_cost if unit_cost > 0 else 0.0
            return p, profit, margin, roi, markup, fees, shipping_cost, tax, base_fee + trans_fee, fixed_fee
            
        calculated_price = 0.0
        if request.mode == 1:
            calculated_price = request.input_value
        elif request.mode == 2:
            m = request.input_value / 100.0
            denom = 1.0 - total_rate - m
            if denom > 0:
                p_nocap = (unit_cost + fixed_fee + shipping_cost) / denom
                if (p_nocap * (r_comm + r_service)) > 100.0:
                    denom_cap = 1.0 - r_trans - r_tax - m
                    calculated_price = (unit_cost + 100.0 + fixed_fee + shipping_cost) / denom_cap if denom_cap > 0 else p_nocap
                else:
                    calculated_price = p_nocap
            else:
                calculated_price = 0.0
        elif request.mode == 3:
            l_rs = request.input_value
            denom = 1.0 - total_rate
            if denom > 0:
                p_nocap = (unit_cost + fixed_fee + shipping_cost + l_rs) / denom
                if (p_nocap * (r_comm + r_service)) > 100.0:
                    denom_cap = 1.0 - r_trans - r_tax
                    calculated_price = (unit_cost + 100.0 + fixed_fee + shipping_cost + l_rs) / denom_cap if denom_cap > 0 else p_nocap
                else:
                    calculated_price = p_nocap
            else:
                calculated_price = 0.0
                
        # Calculate breakeven
        denom_be = 1.0 - total_rate
        be_nocap = (unit_cost + fixed_fee + shipping_cost) / denom_be if denom_be > 0 else 0.0
        if (be_nocap * (r_comm + r_service)) > 100.0:
            denom_cap = 1.0 - r_trans - r_tax
            breakeven_price = (unit_cost + 100.0 + fixed_fee + shipping_cost) / denom_cap if denom_cap > 0 else be_nocap
        else:
            breakeven_price = be_nocap
            
        calculated_price = round(calculated_price, 2)
        price, net_profit, margin, roi, markup, fees, shipping, tax, comm_val, fix_val = eval_shopee_price(calculated_price)
        
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
            unit_cost=round(unit_cost, 2),
            purchase_cost=purchase_cost_rounded,
            packaging_cost=packaging_cost_rounded,
            fixed_operational_cost=fixed_operational_cost_rounded,
            variable_operational_cost=variable_operational_cost_rounded,
            commission_percent_val=round(comm_val, 2),
            fixed_fee_val=round(fix_val, 2),
            raw_shipping_val=round(shipping, 2),
            shipping_discount_val=0.0,
            selected_packaging_id=selected_pkg.get("id") if selected_pkg else None,
            selected_packaging_name=selected_pkg.get("name", "") if selected_pkg else "",
            tax_rate=shopee_config["tax_rate"]
        )
    else:
        raise ValueError("Invalid marketplace")
