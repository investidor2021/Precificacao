from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- Supplier ---
class SupplierBase(BaseModel):
    name: str
    contact: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Product ---
class ProductBase(BaseModel):
    sku: str
    name: str
    category: Optional[str] = None
    supplier_id: Optional[int] = None
    purchase_cost: float
    quantity_acquired: int = 1
    weight: float = 0.0
    height: float = 0.0
    width: float = 0.0
    length: float = 0.0

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    supplier_id: Optional[int] = None
    purchase_cost: Optional[float] = None
    quantity_acquired: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    width: Optional[float] = None
    length: Optional[float] = None

class ProductResponse(ProductBase):
    id: int
    cubic_weight: float
    unit_cost: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Packaging ---
class PackagingBase(BaseModel):
    name: str
    cost: float
    type: str # "box", "envelope", "label", "tape", "bubble_wrap", "other"

class PackagingCreate(PackagingBase):
    pass

class PackagingResponse(PackagingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Operational Cost ---
class OperationalCostBase(BaseModel):
    name: str
    amount: float
    type: str # "fixed", "variable"

class OperationalCostCreate(OperationalCostBase):
    pass

class OperationalCostResponse(OperationalCostBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Marketplace Configurations ---
class MercadoLivreConfigBase(BaseModel):
    classic_commission_rate: float
    premium_commission_rate: float
    fixed_fee_threshold: float
    fixed_fee: float
    tax_rate: float
    shipping_subsidy_rate: float

class MercadoLivreConfigResponse(MercadoLivreConfigBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class ShopeeConfigBase(BaseModel):
    commission_rate: float
    service_fee_rate: float
    transaction_fee_rate: float
    tax_rate: float
    fixed_fee: float
    has_free_shipping_program: bool
    has_cashback_program: bool

class ShopeeConfigResponse(ShopeeConfigBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

# --- Simulations ---
class SimulationBase(BaseModel):
    product_id: Optional[int] = None
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    marketplace: str
    mode: int
    input_value: float
    calculated_price: float
    calculated_profit: float
    calculated_margin: float
    calculated_roi: float
    calculated_fees: float
    calculated_shipping: float

class SimulationResponse(SimulationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Calculations / Simulator APIs ---
class SimulatorRequest(BaseModel):
    product_id: int
    marketplace: str # "mercado_livre_classic", "mercado_livre_premium", "shopee"
    mode: int # 1 = Selling Price, 2 = Desired Margin %, 3 = Desired Profit R$
    input_value: float # selling price R$, margin % (e.g. 20 for 20%), or profit R$
    reputation_good: Optional[bool] = True
    shipping_override: Optional[float] = None
    is_kit: Optional[bool] = False
    free_shipping: Optional[bool] = False

class SimulatorResult(BaseModel):
    price: float
    net_profit: float
    margin: float # in % (e.g. 25.0)
    roi: float # in % (e.g. 50.0)
    markup: float
    breakeven_price: float
    marketplace_fees: float
    shipping_cost: float
    tax_cost: float
    unit_cost: float

# --- Comparator ---
class ComparatorRequest(BaseModel):
    product_id: int
    shipping_override: Optional[float] = None

class MarketplaceComparisonDetails(BaseModel):
    marketplace_name: str
    price: float
    fees: float
    shipping: float
    tax: float
    profit: float
    margin: float
    roi: float

class ComparatorResponse(BaseModel):
    product_name: str
    sku: str
    unit_cost: float
    comparisons: List[MarketplaceComparisonDetails]
    best_marketplace: str

# --- Smart Pricing ---
class SmartPricingRequest(BaseModel):
    product_id: Optional[int] = None
    custom_cost: Optional[float] = None
    category: str
    competitors: List[float]
    is_kit: Optional[bool] = False

class SmartPricingTier(BaseModel):
    strategy: str # "Mínimo", "Ideal", "Agressivo"
    price: float
    profit: float
    margin: float
    roi: float
    description: str

class SmartPricingResponse(BaseModel):
    tiers: List[SmartPricingTier]

# --- Dashboard ---
class ProfitByProductItem(BaseModel):
    name: str
    sku: str
    ml_classic_profit: float
    ml_premium_profit: float
    shopee_profit: float

class MarketShareItem(BaseModel):
    marketplace: str
    average_profit: float
    average_margin: float

class MarginEvolutionItem(BaseModel):
    date: str
    ml_classic_margin: float
    ml_premium_margin: float
    shopee_margin: float

class DashboardResponse(BaseModel):
    total_products: int
    average_profit: float
    average_margin: float
    average_roi: float
    profit_by_product: List[ProfitByProductItem]
    marketplace_comparison: List[MarketShareItem]
    margin_evolution: List[MarginEvolutionItem]


# --- Kits ---
class KitItemBase(BaseModel):
    product_id: int
    quantity: int

class KitItemCreate(KitItemBase):
    pass

class KitItemResponse(KitItemBase):
    id: int
    kit_id: int
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    product_purchase_cost: Optional[float] = None

    class Config:
        from_attributes = True

class KitBase(BaseModel):
    sku: str
    name: str
    category: Optional[str] = None
    weight: float = 0.0
    height: float = 0.0
    width: float = 0.0
    length: float = 0.0

class KitCreate(KitBase):
    items: List[KitItemCreate]

class KitResponse(KitBase):
    id: int
    items: List[KitItemResponse]
    purchase_cost: float = 0.0
    unit_cost: float = 0.0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
