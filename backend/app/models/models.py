import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    contact = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    products = relationship("Product", back_populates="supplier")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    purchase_cost = Column(Float, nullable=False)
    quantity_acquired = Column(Integer, default=1)
    weight = Column(Float, default=0.0) # in kg
    height = Column(Float, default=0.0) # in cm
    width = Column(Float, default=0.0) # in cm
    length = Column(Float, default=0.0) # in cm
    cubic_weight = Column(Float, default=0.0) # calculated
    unit_cost = Column(Float, default=0.0) # fully loaded unit cost (purchase + packaging + operational overhead share)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    supplier = relationship("Supplier", back_populates="products")

class Packaging(Base):
    __tablename__ = "packaging"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    cost = Column(Float, nullable=False)
    type = Column(String, nullable=False) # "box", "envelope", "label", "tape", "bubble_wrap", "other"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class OperationalCost(Base):
    __tablename__ = "operational_costs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False) # "fixed" (monthly) or "variable" (per unit)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class MercadoLivreConfig(Base):
    __tablename__ = "mercado_livre_config"
    
    id = Column(Integer, primary_key=True, index=True)
    classic_commission_rate = Column(Float, default=11.5)
    premium_commission_rate = Column(Float, default=16.5)
    fixed_fee_threshold = Column(Float, default=79.0)
    fixed_fee = Column(Float, default=6.0)
    tax_rate = Column(Float, default=4.0) # custom tax rate %
    shipping_subsidy_rate = Column(Float, default=50.0) # default shipping discount % for seller
    is_active = Column(Boolean, default=True)

class ShopeeConfig(Base):
    __tablename__ = "shopee_config"
    
    id = Column(Integer, primary_key=True, index=True)
    commission_rate = Column(Float, default=14.0)
    service_fee_rate = Column(Float, default=6.0)
    transaction_fee_rate = Column(Float, default=2.0)
    tax_rate = Column(Float, default=4.0)
    has_free_shipping_program = Column(Boolean, default=True)
    has_cashback_program = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

class MercadoLivreShippingFee(Base):
    __tablename__ = "ml_shipping_fees"
    
    id = Column(Integer, primary_key=True, index=True)
    weight_min = Column(Float, nullable=False)
    weight_max = Column(Float, nullable=False)
    fee = Column(Float, nullable=False)

class Simulation(Base):
    __tablename__ = "simulations"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product_sku = Column(String, nullable=True)
    product_name = Column(String, nullable=True)
    marketplace = Column(String, nullable=False) # "mercado_livre_classic", "mercado_livre_premium", "shopee"
    mode = Column(Integer, nullable=False) # 1, 2, 3
    input_value = Column(Float, nullable=False) # user input metric
    calculated_price = Column(Float, nullable=False)
    calculated_profit = Column(Float, nullable=False)
    calculated_margin = Column(Float, nullable=False)
    calculated_roi = Column(Float, nullable=False)
    calculated_fees = Column(Float, nullable=False)
    calculated_shipping = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
