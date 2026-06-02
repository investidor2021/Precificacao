from fastapi import APIRouter, HTTPException
import datetime
from typing import List

from app.schemas.schemas import (
    DashboardResponse, ProfitByProductItem, 
    MarketShareItem, MarginEvolutionItem, SimulatorRequest
)
from app.services.sheets import sheets_db
from app.services.pricing import get_loaded_unit_cost, simulate_pricing_engine

router = APIRouter()

@router.get("/", response_model=DashboardResponse)
async def get_dashboard_data():
    try:
        products = sheets_db.get_products()
        total_products = len(products)
        
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
            unit_cost = await get_loaded_unit_cost(sheets_db, prod)
            ref_price = round(unit_cost * 1.5, 2)
            
            ml_c_profit = 0.0
            ml_p_profit = 0.0
            sh_profit = 0.0
            
            # Simulate ML Classic
            try:
                ml_c_res = await simulate_pricing_engine(sheets_db, SimulatorRequest(
                    product_id=prod["id"], marketplace="mercado_livre_classic", mode=1, input_value=ref_price
                ))
                ml_c_profit = ml_c_res.net_profit
                ml_classic_margins.append(ml_c_res.margin)
                ml_classic_rois.append(ml_c_res.roi)
                ml_classic_profits.append(ml_c_profit)
            except Exception:
                pass
                
            # Simulate ML Premium
            try:
                ml_p_res = await simulate_pricing_engine(sheets_db, SimulatorRequest(
                    product_id=prod["id"], marketplace="mercado_livre_premium", mode=1, input_value=ref_price
                ))
                ml_p_profit = ml_p_res.net_profit
                ml_premium_margins.append(ml_p_res.margin)
                ml_premium_rois.append(ml_p_res.roi)
                ml_premium_profits.append(ml_p_profit)
            except Exception:
                pass
                
            # Simulate Shopee
            try:
                sh_res = await simulate_pricing_engine(sheets_db, SimulatorRequest(
                    product_id=prod["id"], marketplace="shopee", mode=1, input_value=ref_price
                ))
                sh_profit = sh_res.net_profit
                shopee_margins.append(sh_res.margin)
                shopee_rois.append(sh_res.roi)
                shopee_profits.append(sh_profit)
            except Exception:
                pass
                
            profit_items.append(ProfitByProductItem(
                name=prod["name"],
                sku=prod["sku"],
                ml_classic_profit=round(ml_c_profit, 2),
                ml_premium_profit=round(ml_p_profit, 2),
                shopee_profit=round(sh_profit, 2)
            ))
            
        all_margins = ml_classic_margins + ml_premium_margins + shopee_margins
        all_rois = ml_classic_rois + ml_premium_rois + shopee_rois
        all_profits = ml_classic_profits + ml_premium_profits + shopee_profits
        
        avg_margin = sum(all_margins) / len(all_margins) if all_margins else 0.0
        avg_roi = sum(all_rois) / len(all_rois) if all_rois else 0.0
        avg_profit = sum(all_profits) / len(all_profits) if all_profits else 0.0
        
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
        
        # Pull past simulations logs
        sim_logs = sheets_db.get_simulations()
        
        margin_evolution = []
        if len(sim_logs) >= 5:
            grouped = {}
            for log in sim_logs:
                # Format or group dates
                try:
                    dt = datetime.datetime.fromisoformat(log["created_at"])
                    day = dt.strftime("%d/%m")
                except Exception:
                    day = "01/06"
                if day not in grouped:
                    grouped[day] = {"classic": [], "premium": [], "shopee": []}
                if log["marketplace"] == "mercado_livre_classic":
                    grouped[day]["classic"].append(log["calculated_margin"])
                elif log["marketplace"] == "mercado_livre_premium":
                    grouped[day]["premium"].append(log["calculated_margin"])
                elif log["marketplace"] == "shopee":
                    grouped[day]["shopee"].append(log["calculated_margin"])
                    
            for day, vals in grouped.items():
                c_marg = sum(vals["classic"]) / len(vals["classic"]) if vals["classic"] else ml_c_avg_marg
                p_marg = sum(vals["premium"]) / len(vals["premium"]) if vals["premium"] else ml_p_avg_marg
                s_marg = sum(vals["shopee"]) / len(vals["shopee"]) if vals["shopee"] else sh_avg_marg
                margin_evolution.append(MarginEvolutionItem(
                    date=day,
                    ml_classic_margin=round(c_marg, 2),
                    ml_premium_margin=round(p_marg, 2),
                    shopee_margin=round(s_marg, 2)
                ))
        else:
            # Generate mock visual points
            now = datetime.datetime.utcnow()
            for i in range(5, 0, -1):
                date_str = (now - datetime.timedelta(days=i)).strftime("%d/%m")
                margin_evolution.append(MarginEvolutionItem(
                    date=date_str,
                    ml_classic_margin=round(ml_c_avg_marg or 20.0, 2),
                    ml_premium_margin=round(ml_p_avg_marg or 15.0, 2),
                    shopee_margin=round(sh_avg_marg or 18.0, 2)
                ))
                
        return DashboardResponse(
            total_products=total_products,
            average_profit=round(avg_profit, 2),
            average_margin=round(avg_margin, 2),
            average_roi=round(avg_roi, 2),
            profit_by_product=profit_items[:10],
            marketplace_comparison=marketplace_comparison,
            margin_evolution=margin_evolution
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
