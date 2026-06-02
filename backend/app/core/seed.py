from sqlalchemy.future import select
from app.models.models import MercadoLivreConfig, ShopeeConfig, MercadoLivreShippingFee

async def seed_database(db):
    # 1. Seed Mercado Livre configuration
    ml_check = await db.execute(select(MercadoLivreConfig))
    if not ml_check.scalar_one_or_none():
        db.add(MercadoLivreConfig(
            classic_commission_rate=11.5,
            premium_commission_rate=16.5,
            fixed_fee_threshold=79.0,
            fixed_fee=6.0,
            tax_rate=4.0,
            shipping_subsidy_rate=50.0
        ))
        
    # 2. Seed Shopee configuration
    sh_check = await db.execute(select(ShopeeConfig))
    if not sh_check.scalar_one_or_none():
        db.add(ShopeeConfig(
            commission_rate=14.0,
            service_fee_rate=6.0,
            transaction_fee_rate=2.0,
            tax_rate=4.0,
            has_free_shipping_program=True,
            has_cashback_program=False
        ))
        
    # 3. Seed Mercado Livre shipping tables
    fee_check = await db.execute(select(MercadoLivreShippingFee))
    if not fee_check.scalars().first():
        fees = [
            MercadoLivreShippingFee(weight_min=0.0, weight_max=0.5, fee=19.90),
            MercadoLivreShippingFee(weight_min=0.5, weight_max=1.0, fee=22.90),
            MercadoLivreShippingFee(weight_min=1.0, weight_max=2.0, fee=24.90),
            MercadoLivreShippingFee(weight_min=2.0, weight_max=5.0, fee=29.90),
            MercadoLivreShippingFee(weight_min=5.0, weight_max=9.0, fee=39.90),
            MercadoLivreShippingFee(weight_min=9.0, weight_max=30.0, fee=59.90),
        ]
        db.add_all(fees)
        
    await db.commit()
print("Seed verified/applied.")
