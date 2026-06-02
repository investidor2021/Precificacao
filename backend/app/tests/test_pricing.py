import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.pricing import calculate_cubic_weight, get_loaded_unit_cost, get_ml_shipping_cost, simulate_pricing_engine
from app.services.smart_pricing import calculate_smart_pricing
from app.models.models import Product, Packaging, OperationalCost, MercadoLivreConfig, ShopeeConfig, MercadoLivreShippingFee
from app.schemas.schemas import SimulatorRequest, SmartPricingRequest

# --- Unit Tests for Core Services ---

@pytest.mark.asyncio
async def test_calculate_cubic_weight():
    # Standard dimensions: 10x20x30 cm
    # (10 * 20 * 30) / 6000 = 6000 / 6000 = 1.0 kg
    cubic = await calculate_cubic_weight(10, 20, 30)
    assert cubic == 1.0
    
    # Zero dimensions
    cubic_zero = await calculate_cubic_weight(0, 20, 30)
    assert cubic_zero == 0.0

@pytest.mark.asyncio
async def test_get_loaded_unit_cost():
    # Mock DB session
    db = AsyncMock()
    
    # Product cost
    prod = Product(purchase_cost=50.0)
    
    # Packaging items: R$ 2.50 box, R$ 0.50 label
    pkgs = [
        Packaging(cost=2.50, type="box"),
        Packaging(cost=0.50, type="label")
    ]
    
    # Operational costs: R$ 500 fixed monthly, R$ 1.50 variable per unit
    ops = [
        OperationalCost(amount=500.0, type="fixed"),
        OperationalCost(amount=1.50, type="variable")
    ]
    
    # Setup mock executes
    mock_execute = MagicMock()
    db.execute = mock_execute
    
    # Return values for sequential calls: Packaging, OperationalCost
    mock_execute.side_effect = [
        MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=pkgs)))),
        MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=ops))))
    ]
    
    # Cost = 50.0 (purchase) + 3.0 (pkgs) + 0.50 (fixed operational share: 500 / 1000) + 1.50 (variable op)
    # Total = 55.00
    cost = await get_loaded_unit_cost(db, prod)
    assert cost == 55.00

@pytest.mark.asyncio
async def test_get_ml_shipping_cost():
    db = AsyncMock()
    
    ml_config = MercadoLivreConfig(shipping_subsidy_rate=50.0)
    
    # Shipping brackets
    brackets = [
        MercadoLivreShippingFee(weight_min=0.0, weight_max=0.5, fee=19.90),
        MercadoLivreShippingFee(weight_min=0.5, weight_max=1.0, fee=22.90),
        MercadoLivreShippingFee(weight_min=1.0, weight_max=2.0, fee=24.90),
    ]
    
    db.execute.return_value = MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=brackets))))
    
    # Product effective weight fits bracket 2 (1.5 kg) -> fee R$ 24.90
    # Subsidized by 50% -> R$ 12.45
    shipping = await get_ml_shipping_cost(db, 1.5, 10, 10, 10, ml_config)
    assert shipping == 12.45

@pytest.mark.asyncio
async def test_smart_pricing_engine():
    db = AsyncMock()
    
    # Mock product with unit cost loaded
    product = Product(id=1, sku="SKU-1", name="Product 1", purchase_cost=10.0, weight=0.1, height=1, width=1, length=1)
    
    # Mock DB responses: Product query, packaging, operational costs, ml_config
    db.execute.side_effect = [
        # Product fetch
        MagicMock(scalar_one_or_none=MagicMock(return_value=product)),
        # Packaging
        MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))),
        # Operational
        MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))),
        # ML Config
        MagicMock(scalar_one_or_none=MagicMock(return_value=MercadoLivreConfig())),
    ]
    
    req = SmartPricingRequest(
        product_id=1,
        category="Electronics",
        competitors=[50.0, 52.0, 48.0]
    )
    
    res = await calculate_smart_pricing(db, req)
    
    # We expect 3 strategy tiers
    assert len(res.tiers) == 3
    assert res.tiers[0].strategy == "Mínimo"
    assert res.tiers[1].strategy == "Ideal"
    assert res.tiers[2].strategy == "Agressivo"
    
    # Aggressive price must try to compete with lowest (48.0) -> e.g. 47.90
    assert res.tiers[2].price <= 48.0
