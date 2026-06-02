from fastapi import APIRouter, Depends
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
import datetime
from typing import List

from app.core.database import get_db
from app.models.models import Product, Simulation
from app.schemas.schemas import (
    DashboardResponse, ProfitByProductItem, 
    MarketShareItem, MarginEvolutionItem, SimulatorRequest
)
from app.services.pricing import get_loaded_unit_cost, simulate_pricing_engine

router = APIRouter()

@router.get("/", response_model=DashboardResponse)
async def get_dashboard_data(db: AsyncSession = Depends(get_db)):
    # 1. Total products
    product_count_result = await db.execute(select(func.count(Product.id)))
    total_products = product_count_result.scalar() or 0
    
    # Fetch all products to compile dynamic averages
    products_result = await db.execute(select(Product))
    products = products_result.scalars().all()
    
    profit_items: List[ProfitByProductItem] = []
    ml_classic_margins = []
    ml_premium_margins = []
    shopee_margins = []
    
    ml_classic_rois = []
    ml_premium_rois = []
    shopee_rois = []
    
    ml_classic_profits = []
    ml_premium_profits = []
    shopee_profits = []
    
    for prod in products:
        unit_cost = await get_loaded_unit_cost(db, prod)
        ref_price = round(unit_cost * 1.5, 2)
        
        # Simulate each marketplace at 1.5x markup baseline
        ml_c_profit = 0.0
        ml_p_profit = 0.0
        sh_profit = 0.0
        
        try:
            # ML Classic
            ml_c_res = await simulate_pricing_engine(db, SimulatorRequest(
                product_id=prod.id, marketplace="mercado_livre_classic", mode=1, input_value=ref_price
            ))
            ml_c_profit = ml_c_res.net_profit
            ml_classic_margins.append(ml_c_res.margin)
            ml_classic_rois.append(ml_c_res.roi)
            ml_classic_profits.append(ml_c_profit)
        except Exception:
            pass
            
        try:
            # ML Premium
            ml_p_res = await simulate_pricing_engine(db, SimulatorRequest(
                product_id=prod.id, marketplace="mercado_livre_premium", mode=1, input_value=ref_price
            ))
            ml_p_profit = ml_p_res.net_profit
            ml_premium_margins.append(ml_p_res.margin)
            ml_premium_rois.append(ml_p_res.roi)
            ml_premium_profits.append(ml_p_profit)
        except Exception:
            pass
            
        try:
            # Shopee
            sh_res = await simulate_pricing_engine(db, SimulatorRequest(
                product_id=prod.id, marketplace="shopee", mode=1, input_value=ref_price
            ))
            sh_profit = sh_res.net_profit
            shopee_margins.append(sh_res.margin)
            shopee_rois.append(sh_res.roi)
            shopee_profits.append(sh_profit)
        except Exception:
            pass
            
        profit_items.append(ProfitByProductItem(
            name=prod.name,
            sku=prod.sku,
            ml_classic_profit=round(ml_c_profit, 2),
            ml_premium_profit=round(ml_p_profit, 2),
            shopee_profit=round(sh_profit, 2)
        ))
        
    # Calculate global averages across all simulations
    all_margins = ml_classic_margins + ml_premium_margins + shopee_margins
    all_rois = ml_classic_rois + ml_premium_rois + shopee_rois
    all_profits = ml_classic_profits + ml_premium_profits + shopee_profits
    
    avg_margin = sum(all_margins) / len(all_margins) if all_margins else 0.0
    avg_roi = sum(all_rois) / len(all_rois) if all_rois else 0.0
    avg_profit = sum(all_profits) / len(all_profits) if all_profits else 0.0
    
    # Marketplace comparative chart data
    ml_c_avg_prof = sum(ml_classic_profits) / len(ml_classic_profits) if ml_classic_profits else 0.0
    ml_c_avg_marg = sum(ml_classic_margins) / len(ml_classic_margins) if ml_classic_margins else 0.0
    
    ml_p_avg_prof = sum(ml_premium_profits) / len(ml_premium_profits) if ml_premium_profits else 0.0
    ml_p_avg_marg = sum(ml_premium_margins) / len(ml_premium_margins) if ml_premium_margins else 0.0
    
    sh_avg_prof = sum(shopee_profits) / len(shopee_profits) if shopee_profits else 0.0
    sh_avg_marg = sum(shopee_margins) / len(shopee_margins) if shopee_margins else 0.0
    
    marketplace_comparison = [
        MarketShareItem(marketplace="Mercado Livre Clássico", average_profit=round(ml_c_avg_prof, 2), average_margin=round(ml_c_avg_marg, 2)),
        MarketShareItem(marketplace="Mercado Livre Premium", average_profit=round(ml_p_avg_prof, 2), average_margin=round(ml_p_avg_marg, 2)),
        MarketShareItem(marketplace="Shopee", average_profit=round(sh_avg_prof, 2), average_margin=round(sh_avg_marg, 2))
    ]
    
    # Margin evolution chart data
    # Group past simulations by date, default to mock trend line if less than 5 simulation logs
    sim_logs_result = await db.execute(select(Simulation).order_by(Simulation.created_at.asc()))
    sim_logs = sim_logs_result.scalars().all()
    
    margin_evolution = []
    if len(sim_logs) >= 5:
        # Group by day
        grouped = {}
        for log in sim_logs:
            day = log.created_at.strftime("%d/%m")
            if day not in grouped:
                grouped[day] = {"classic": [], "premium": [], "shopee": []}
            if log.marketplace == "mercado_livre_classic":
                grouped[day]["classic"].append(log.calculated_margin)
            elif log.marketplace == "mercado_livre_premium":
                grouped[day]["premium"].append(log.calculated_margin)
            elif log.marketplace == "shopee":
                grouped[day]["shopee"].append(log.calculated_margin)
                
        for day, vals in grouped.items():
            c_marg = sum(vals["classic"]) / len(vals["classic"]) if vals["classic"] else (ml_c_avg_marg or 20.0)
            p_marg = sum(vals["premium"]) / len(vals["premium"]) if vals["premium"] else (ml_p_avg_marg or 15.0)
            s_marg = sum(vals["shopee"]) / len(vals["shopee"]) if vals["shopee"] else (sh_avg_marg or 18.0)
            margin_evolution.append(MarginEvolutionItem(
                date=day,
                ml_classic_margin=round(c_marg, 2),
                ml_premium_margin=round(p_marg, 2),
                shopee_margin=round(s_marg, 2)
            ))
    else:
        # Generate clean seed visual data points for chart
        now = datetime.datetime.utcnow()
        for i in range(5, 0, -1):
            date_str = (now - datetime.timedelta(days=i)).strftime("%d/%m")
            # Create a slight trend
            margin_evolution.append(MarginEvolutionItem(
                date=date_str,
                ml_classic_margin=round((ml_c_avg_marg or 20.0) - (i * 0.5) + 1.0, 2),
                ml_premium_margin=round((ml_p_avg_marg or 15.0) - (i * 0.3) + 0.8, 2),
                shopee_margin=round((sh_avg_marg or 18.0) - (i * 0.4) + 0.9, 2)
            ))
            
    return DashboardResponse(
        total_products=total_products,
        average_profit=round(avg_profit, 2),
        average_margin=round(avg_margin, 2),
        average_roi=round(avg_roi, 2),
        profit_by_product=profit_items[:10], # Cap at top 10 products
        marketplace_comparison=marketplace_comparison,
        margin_evolution=margin_evolution
    )
