import pytest
from unittest.mock import MagicMock
from app.services.pricing import calculate_cubic_weight, get_loaded_unit_cost, get_ml_shipping_cost, simulate_pricing_engine
from app.services.smart_pricing import calculate_smart_pricing
from app.schemas.schemas import SimulatorRequest, SmartPricingRequest

@pytest.mark.asyncio
async def test_calculate_cubic_weight():
    # 10x20x30 cm -> (10*20*30)/6000 = 1.0 kg
    cubic = await calculate_cubic_weight(10, 20, 30)
    assert cubic == 1.0
    
    cubic_zero = await calculate_cubic_weight(0, 20, 30)
    assert cubic_zero == 0.0

@pytest.mark.asyncio
async def test_get_loaded_unit_cost_sheets():
    sheets_db = MagicMock()
    
    # Mock product dict row
    prod = {"purchase_cost": 50.0}
    
    # Mock packaging items: R$ 2.50 box, R$ 0.50 label
    pkgs = [
        {"cost": 2.50, "type": "box"},
        {"cost": 0.50, "type": "label"}
    ]
    
    # Mock operational costs: R$ 500 fixed, R$ 1.50 variable
    ops = [
        {"amount": 500.0, "type": "fixed"},
        {"amount": 1.50, "type": "variable"}
    ]
    
    sheets_db.get_packaging.return_value = pkgs
    sheets_db.get_operational_costs.return_value = ops
    
    # Cost = 50.0 (purchase) + 3.0 (pkgs) + 0.50 (fixed: 500/1000) + 1.50 (variable) = 55.00
    cost = await get_loaded_unit_cost(sheets_db, prod)
    assert cost == 55.00

@pytest.mark.asyncio
async def test_get_ml_shipping_cost_sheets():
    sheets_db = MagicMock()
    ml_config = {"shipping_subsidy_rate": 50.0}
    
    # Product fits 1.5kg bracket -> standard fee R$ 24.90
    # Subsidized 50% -> R$ 12.45
    shipping = await get_ml_shipping_cost(sheets_db, 1.5, 10, 10, 10, ml_config)
    assert shipping == 12.45

@pytest.mark.asyncio
async def test_smart_pricing_engine_sheets():
    sheets_db = MagicMock()
    
    product = {
        "id": 1,
        "sku": "SKU-1",
        "name": "Product 1",
        "purchase_cost": 10.0,
        "weight": 0.1,
        "height": 1,
        "width": 1,
        "length": 1
    }
    
    sheets_db.get_product.return_value = product
    sheets_db.get_packaging.return_value = []
    sheets_db.get_operational_costs.return_value = []
    sheets_db.get_ml_config.return_value = {
        "classic_commission_rate": 11.5,
        "fixed_fee_threshold": 79.0,
        "fixed_fee": 6.0,
        "tax_rate": 4.0,
        "shipping_subsidy_rate": 50.0
    }
    
    req = SmartPricingRequest(
        product_id=1,
        category="Electronics",
        competitors=[50.0, 52.0, 48.0]
    )
    
    res = await calculate_smart_pricing(sheets_db, req)
    
    assert len(res.tiers) == 3
    assert res.tiers[0].strategy == "Mínimo"
    assert res.tiers[1].strategy == "Ideal"
    assert res.tiers[2].strategy == "Agressivo"
    assert res.tiers[2].price <= 48.0

@pytest.mark.asyncio
async def test_kit_simulation_pricing():
    sheets_db = MagicMock()
    
    prod_1 = {"id": 1, "sku": "P1", "name": "Prod 1", "purchase_cost": 10.0, "weight": 0.1, "height": 1, "width": 1, "length": 1, "cubic_weight": 0.0, "unit_cost": 10.0}
    prod_2 = {"id": 2, "sku": "P2", "name": "Prod 2", "purchase_cost": 20.0, "weight": 0.2, "height": 1, "width": 1, "length": 1, "cubic_weight": 0.0, "unit_cost": 20.0}
    
    kit = {
        "id": 1,
        "sku": "KIT-1",
        "name": "Kit 1",
        "weight": 0.5,
        "height": 2,
        "width": 2,
        "length": 2,
        "purchase_cost": 40.0,
        "items": [
            {"product_id": 1, "quantity": 2, "product_sku": "P1", "product_name": "Prod 1", "product_purchase_cost": 10.0},
            {"product_id": 2, "quantity": 1, "product_sku": "P2", "product_name": "Prod 2", "product_purchase_cost": 20.0}
        ]
    }
    
    sheets_db.get_kit.return_value = kit
    sheets_db.get_packaging.return_value = []
    sheets_db.get_operational_costs.return_value = []
    sheets_db.get_ml_config.return_value = {
        "classic_commission_rate": 11.5,
        "premium_commission_rate": 16.5,
        "fixed_fee_threshold": 79.0,
        "fixed_fee": 6.0,
        "tax_rate": 4.0,
        "shipping_subsidy_rate": 50.0
    }
    
    req = SimulatorRequest(
        product_id=1,
        marketplace="mercado_livre_classic",
        mode=1,
        input_value=100.0,
        is_kit=True
    )
    
    res = await simulate_pricing_engine(sheets_db, req)
    
    assert res.unit_cost == 40.0
    assert res.price == 100.0
    assert res.net_profit == 34.55

@pytest.mark.asyncio
async def test_kit_simulation_pricing_free_shipping_under_79():
    sheets_db = MagicMock()
    
    prod_1 = {"id": 1, "sku": "P1", "name": "Prod 1", "purchase_cost": 10.0, "weight": 0.1, "height": 1, "width": 1, "length": 1, "cubic_weight": 0.0, "unit_cost": 10.0}
    prod_2 = {"id": 2, "sku": "P2", "name": "Prod 2", "purchase_cost": 20.0, "weight": 0.2, "height": 1, "width": 1, "length": 1, "cubic_weight": 0.0, "unit_cost": 20.0}
    
    kit = {
        "id": 1,
        "sku": "KIT-1",
        "name": "Kit 1",
        "weight": 0.5,
        "height": 2,
        "width": 2,
        "length": 2,
        "purchase_cost": 40.0,
        "items": [
            {"product_id": 1, "quantity": 2, "product_sku": "P1", "product_name": "Prod 1", "product_purchase_cost": 10.0},
            {"product_id": 2, "quantity": 1, "product_sku": "P2", "product_name": "Prod 2", "product_purchase_cost": 20.0}
        ]
    }
    
    sheets_db.get_kit.return_value = kit
    sheets_db.get_packaging.return_value = []
    sheets_db.get_operational_costs.return_value = []
    sheets_db.get_ml_config.return_value = {
        "classic_commission_rate": 11.5,
        "premium_commission_rate": 16.5,
        "fixed_fee_threshold": 79.0,
        "fixed_fee": 6.0,
        "tax_rate": 4.0,
        "shipping_subsidy_rate": 50.0
    }
    
    req = SimulatorRequest(
        product_id=1,
        marketplace="mercado_livre_classic",
        mode=1,
        input_value=75.0,
        is_kit=True,
        free_shipping=True
    )
    
    res = await simulate_pricing_engine(sheets_db, req)
    
    assert res.unit_cost == 40.0
    assert res.price == 75.0
    assert res.shipping_cost == 9.95
    assert res.net_profit == 7.43


@pytest.mark.asyncio
async def test_simulate_pricing_engine_breakdown():
    sheets_db = MagicMock()
    
    product = {
        "id": 1,
        "sku": "SKU-TEST",
        "name": "Test Product",
        "purchase_cost": 50.0,
        "weight": 1.5,
        "height": 10,
        "width": 10,
        "length": 10
    }
    
    sheets_db.get_product.return_value = product
    
    # Cost = 50.0 + 3.0 (pkgs) + 0.50 (fixed: 500/1000) + 1.50 (variable) = 55.00
    sheets_db.get_packaging.return_value = [
        {"cost": 2.50, "type": "box"},
        {"cost": 0.50, "type": "label"}
    ]
    sheets_db.get_operational_costs.return_value = [
        {"amount": 500.0, "type": "fixed"},
        {"amount": 1.50, "type": "variable"}
    ]
    sheets_db.get_ml_config.return_value = {
        "classic_commission_rate": 11.5,
        "fixed_fee_threshold": 79.0,
        "fixed_fee": 6.0,
        "tax_rate": 4.0,
        "shipping_subsidy_rate": 50.0
    }
    
    # 1. ML Classic under threshold (e.g. 70.0)
    req = SimulatorRequest(
        product_id=1,
        marketplace="mercado_livre_classic",
        mode=1,
        input_value=70.0,
        is_kit=False,
        free_shipping=False
    )
    
    res = await simulate_pricing_engine(sheets_db, req)
    assert res.price == 70.0
    assert res.purchase_cost == 50.0
    assert res.packaging_cost == 3.0
    assert res.fixed_operational_cost == 0.50
    assert res.variable_operational_cost == 1.50
    assert res.unit_cost == 55.0
    assert res.commission_percent_val == round(70.0 * 0.115, 2)
    assert res.fixed_fee_val == 6.0
    assert res.shipping_cost == 0.0
    assert res.raw_shipping_val == 0.0
    assert res.shipping_discount_val == 0.0
    
    # 2. ML Classic over threshold (e.g. 100.0)
    req_over = SimulatorRequest(
        product_id=1,
        marketplace="mercado_livre_classic",
        mode=1,
        input_value=100.0,
        is_kit=False,
        free_shipping=False
    )
    
    res_over = await simulate_pricing_engine(sheets_db, req_over)
    assert res_over.price == 100.0
    assert res_over.commission_percent_val == 11.50
    assert res_over.fixed_fee_val == 0.0
    # 1.5kg fits in 1.0kg - 2.0kg bracket: 24.90. Subsidized 50%: 12.45
    assert res_over.shipping_cost == 12.45
    assert res_over.raw_shipping_val == 24.90
    assert res_over.shipping_discount_val == 12.45


def test_calculate_packaging_cost_selection():
    from app.services.pricing import calculate_packaging_cost
    
    # All packaging options
    pkgs = [
        {"cost": 1.50, "name": "Caixa P 16x11x6 cm", "type": "box"},
        {"cost": 2.20, "name": "Caixa M 20x16x7 cm", "type": "box"},
        {"cost": 1.00, "name": "Envelope Bolha 20x15 cm", "type": "envelope"},
        {"cost": 0.30, "name": "Fita Adesiva", "type": "tape"}
    ]
    
    # Product fits in envelope: 15x10x1 cm -> Sorted: 1, 10, 15. Envelope is: sorted([2, 15, 20]) -> 2, 15, 20. Fits!
    prod_small = {"height": 10.0, "width": 15.0, "length": 1.0}
    cost_small = calculate_packaging_cost(prod_small, pkgs)
    # Envelope (1.00) + Fita (0.30) = 1.30
    assert cost_small == 1.30
    
    # Product does not fit in envelope but fits in Box P: 15x10x5 cm -> Sorted: 5, 10, 15. Box P is sorted: 6, 11, 16. Fits!
    prod_medium = {"height": 10.0, "width": 15.0, "length": 5.0}
    cost_medium = calculate_packaging_cost(prod_medium, pkgs)
    # Box P (1.50) + Fita (0.30) = 1.80
    assert cost_medium == 1.80
    
    # Product does not fit in Box P but fits in Box M: 18x12x7 cm -> Sorted: 7, 12, 18. Box M is sorted: 7, 16, 20. Fits!
    prod_large = {"height": 12.0, "width": 18.0, "length": 7.0}
    cost_large = calculate_packaging_cost(prod_large, pkgs)
    # Box M (2.20) + Fita (0.30) = 2.50
    assert cost_large == 2.50




