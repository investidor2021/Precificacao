from typing import List, Optional, Dict, Any
from app.services.pricing import simulate_pricing_engine
from app.schemas.schemas import SimulatorRequest, SmartPricingRequest, SmartPricingResponse, SmartPricingTier

class MockSheetsDB:
    def __init__(self, original_db, custom_cost):
        self.db = original_db
        self.custom_cost = custom_cost

    def get_product(self, product_id):
        return {
            "id": 0,
            "sku": "CUSTOM",
            "name": "Custom Product",
            "purchase_cost": self.custom_cost,
            "weight": 0.0,
            "height": 0.0,
            "width": 0.0,
            "length": 0.0
        }

    def get_kit(self, kit_id):
        return None

    def get_packaging(self):
        return []

    def get_operational_costs(self):
        return []

    def get_ml_config(self):
        return self.db.get_ml_config()

    def get_shopee_config(self):
        return self.db.get_shopee_config()

async def calculate_smart_pricing(sheets_db, request: SmartPricingRequest) -> SmartPricingResponse:
    # 1. Determine which DB and ID to use
    if request.product_id:
        db_to_use = sheets_db
        prod_id_to_use = request.product_id
        is_kit_val = getattr(request, "is_kit", False)
    else:
        custom_cost = request.custom_cost if request.custom_cost is not None else 10.0
        db_to_use = MockSheetsDB(sheets_db, custom_cost)
        prod_id_to_use = 0
        is_kit_val = False

    # Helper to run simulated pricing
    async def run_simulation(marketplace: str, mode: int, val: float) -> Any:
        sim_req = SimulatorRequest(
            product_id=prod_id_to_use,
            marketplace=marketplace,
            mode=mode,
            input_value=val,
            is_kit=is_kit_val,
            category=request.category,
            packaging_override_id=getattr(request, "packaging_override_id", None)
        )
        return await simulate_pricing_engine(db_to_use, sim_req)

    async def get_marketplace_tiers(marketplace: str) -> List[SmartPricingTier]:
        # 1. Strategy: Mínimo (Target margin = 5%)
        res_min = await run_simulation(marketplace, mode=2, val=5.0)
        
        p_min = res_min.price
        min_profit = res_min.net_profit
        min_margin = res_min.margin
        min_roi = res_min.roi
        min_safety = False

        if request.min_desired_margin is not None and min_margin < request.min_desired_margin:
            res_safety = await run_simulation(marketplace, mode=2, val=request.min_desired_margin)
            p_min = res_safety.price
            min_profit = res_safety.net_profit
            min_margin = res_safety.margin
            min_roi = res_safety.roi
            min_safety = True

        # 2. Strategy: Ideal (Dynamic based on competitors)
        competitors = [c for c in request.competitors if c > 0]
        ideal_safety = False
        if competitors:
            comp_avg = sum(competitors) / len(competitors)
            res_avg = await run_simulation(marketplace, mode=1, val=comp_avg)
            p_avg_margin = res_avg.margin / 100.0

            if p_avg_margin < 0.15:
                res_ideal = await run_simulation(marketplace, mode=2, val=15.0)
            elif p_avg_margin > 0.35:
                res_ideal = await run_simulation(marketplace, mode=2, val=30.0)
            else:
                res_ideal = res_avg
        else:
            res_ideal = await run_simulation(marketplace, mode=2, val=25.0)

        p_ideal = res_ideal.price
        ideal_profit = res_ideal.net_profit
        ideal_margin = res_ideal.margin
        ideal_roi = res_ideal.roi

        if request.min_desired_margin is not None and ideal_margin < request.min_desired_margin:
            res_safety = await run_simulation(marketplace, mode=2, val=request.min_desired_margin)
            p_ideal = res_safety.price
            ideal_profit = res_safety.net_profit
            ideal_margin = res_safety.margin
            ideal_roi = res_safety.roi
            ideal_safety = True

        # 3. Strategy: Agressivo (Dynamic based on competitors)
        aggr_safety = False
        if competitors:
            comp_min = min(competitors)
            p_aggr_raw = comp_min - 0.10
            res_aggr_raw = await run_simulation(marketplace, mode=1, val=p_aggr_raw)
            raw_margin = res_aggr_raw.margin

            if request.min_desired_margin is not None and raw_margin < request.min_desired_margin:
                res_safety = await run_simulation(marketplace, mode=2, val=request.min_desired_margin)
                p_aggr = res_safety.price
                aggr_profit = res_safety.net_profit
                aggr_margin = res_safety.margin
                aggr_roi = res_safety.roi
                aggr_safety = True
            else:
                p_aggr = max(p_min, p_aggr_raw)
                if p_aggr == p_min:
                    p_aggr = p_min
                    aggr_profit = min_profit
                    aggr_margin = min_margin
                    aggr_roi = min_roi
                    aggr_safety = min_safety
                else:
                    res_aggr = await run_simulation(marketplace, mode=1, val=p_aggr)
                    p_aggr = res_aggr.price
                    aggr_profit = res_aggr.net_profit
                    aggr_margin = res_aggr.margin
                    aggr_roi = res_aggr.roi
        else:
            res_aggr = await run_simulation(marketplace, mode=2, val=12.0)
            p_aggr = res_aggr.price
            aggr_profit = res_aggr.net_profit
            aggr_margin = res_aggr.margin
            aggr_roi = res_aggr.roi

            if request.min_desired_margin is not None and aggr_margin < request.min_desired_margin:
                res_safety = await run_simulation(marketplace, mode=2, val=request.min_desired_margin)
                p_aggr = res_safety.price
                aggr_profit = res_safety.net_profit
                aggr_margin = res_safety.margin
                aggr_roi = res_safety.roi
                aggr_safety = True

        return [
            SmartPricingTier(
                strategy="Mínimo",
                price=p_min,
                profit=min_profit,
                margin=min_margin,
                roi=min_roi,
                safety_triggered=min_safety,
                description="Preço defensivo para cobrir custos e garantir margem mínima de segurança (5%)."
            ),
            SmartPricingTier(
                strategy="Ideal",
                price=p_ideal,
                profit=ideal_profit,
                margin=ideal_margin,
                roi=ideal_roi,
                safety_triggered=ideal_safety,
                description="Preço otimizado baseado no comportamento de mercado (concorrência) e margem saudável."
            ),
            SmartPricingTier(
                strategy="Agressivo",
                price=p_aggr,
                profit=aggr_profit,
                margin=aggr_margin,
                roi=aggr_roi,
                safety_triggered=aggr_safety,
                description="Preço de combate para destacar nos rankings de busca e ganhar a Buybox."
            )
        ]

    return SmartPricingResponse(
        mercado_livre_classic=await get_marketplace_tiers("mercado_livre_classic"),
        mercado_livre_premium=await get_marketplace_tiers("mercado_livre_premium"),
        shopee=await get_marketplace_tiers("shopee")
    )
