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
