import json
import datetime
import gspread
from google.oauth2.service_account import Credentials
from typing import List, Dict, Any, Optional
from app.core.config import settings

def safe_int(val: Any, default: int = 0) -> int:
    if not val:
        return default
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        pass
    
    digits = "".join(c for c in str(val) if c.isdigit())
    if digits:
        try:
            return int(digits)
        except ValueError:
            pass
    return default

def safe_float(val: Any, default: float = 0.0) -> float:
    if not val:
        return default
    try:
        return float(str(val).replace(",", ".").strip())
    except (ValueError, TypeError):
        return default

SCOPE = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

def get_sheets_client():
    if settings.GOOGLE_CREDENTIALS_JSON:
        try:
            creds_dict = json.loads(settings.GOOGLE_CREDENTIALS_JSON)
            creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPE)
            return gspread.authorize(creds)
        except Exception as e:
            print(f"Error loading credentials from SPREADSHEET_JSON env: {e}")
            
    try:
        creds = Credentials.from_service_account_file(settings.GOOGLE_CREDENTIALS_FILE, scopes=SCOPE)
        return gspread.authorize(creds)
    except Exception as e:
        print(f"Credentials file {settings.GOOGLE_CREDENTIALS_FILE} not found: {e}")
        raise e

class GoogleSheetsService:
    def __init__(self):
        self.client = None
        self.spreadsheet = None

    def connect(self):
        try:
            self.client = get_sheets_client()
            if settings.SPREADSHEET_ID:
                self.spreadsheet = self.client.open_by_key(settings.SPREADSHEET_ID)
            else:
                self.spreadsheet = self.client.open(settings.SPREADSHEET_NAME)
            self.initialize_sheets()
        except Exception as e:
            print("\n" + "="*80)
            print("AVISO CRÍTICO DE CONFIGURAÇÃO DO GOOGLE SHEETS:")
            print(f"Erro ao conectar na Planilha: {e}")
            print("Por favor, verifique se:")
            print(f"1. A planilha '{settings.SPREADSHEET_NAME}' existe no seu Google Drive.")
            print("2. Você compartilhou a planilha com o e-mail da Conta de Serviço (Service Account).")
            print("="*80 + "\n")
            raise e

    def initialize_sheets(self):
        tabs_headers = {
            "produtos": ["id", "sku", "name", "category", "purchase_cost", "quantity_acquired", "weight", "height", "width", "length", "cubic_weight", "unit_cost"],
            "embalagens": ["id", "name", "cost", "type"],
            "custos_operacionais": ["id", "name", "amount", "type"],
            "config_ml": ["classic_commission_rate", "premium_commission_rate", "fixed_fee_threshold", "fixed_fee", "tax_rate", "shipping_subsidy_rate"],
            "config_shopee": ["commission_rate", "service_fee_rate", "transaction_fee_rate", "tax_rate", "has_free_shipping_program", "has_cashback_program"],
            "simulacoes": ["product_sku", "product_name", "marketplace", "mode", "input_value", "calculated_price", "calculated_profit", "calculated_margin", "calculated_roi", "created_at"]
        }

        existing_worksheets = [ws.title for ws in self.spreadsheet.worksheets()]

        for tab_name, headers in tabs_headers.items():
            if tab_name not in existing_worksheets:
                ws = self.spreadsheet.add_worksheet(title=tab_name, rows=100, cols=20)
                ws.append_row(headers)
                
                if tab_name == "config_ml":
                    ws.append_row([11.5, 16.5, 79.0, 6.0, 4.0, 50.0])
                elif tab_name == "config_shopee":
                    ws.append_row([14.0, 6.0, 2.0, 4.0, "TRUE", "FALSE"])
            else:
                ws = self.spreadsheet.worksheet(tab_name)
                row1 = ws.row_values(1)
                if not row1:
                    ws.append_row(headers)

    def _get_worksheet(self, name: str) -> gspread.Worksheet:
        if not self.spreadsheet:
            self.connect()
        return self.spreadsheet.worksheet(name)

    # --- PRODUCTS ---
    def get_products(self) -> List[Dict[str, Any]]:
        ws = self._get_worksheet("produtos")
        records = ws.get_all_records()
        products = []
        for r in records:
            products.append({
                "id": safe_int(r.get("id") or 0),
                "sku": str(r.get("sku")),
                "name": str(r.get("name")),
                "category": str(r.get("category") or ""),
                "purchase_cost": safe_float(r.get("purchase_cost") or 0.0),
                "quantity_acquired": safe_int(r.get("quantity_acquired") or 1),
                "weight": safe_float(r.get("weight") or 0.0),
                "height": safe_float(r.get("height") or 0.0),
                "width": safe_float(r.get("width") or 0.0),
                "length": safe_float(r.get("length") or 0.0),
                "cubic_weight": safe_float(r.get("cubic_weight") or 0.0),
                "unit_cost": safe_float(r.get("unit_cost") or 0.0),
                "created_at": datetime.datetime.utcnow().isoformat(),
                "updated_at": datetime.datetime.utcnow().isoformat()
            })
        return products

    def get_product(self, product_id: int) -> Optional[Dict[str, Any]]:
        products = self.get_products()
        for p in products:
            if p["id"] == product_id:
                return p
        return None

    def get_product_by_sku(self, sku: str) -> Optional[Dict[str, Any]]:
        products = self.get_products()
        for p in products:
            if p["sku"] == sku:
                return p
        return None

    def create_product(self, product_dict: Dict[str, Any]) -> Dict[str, Any]:
        ws = self._get_worksheet("produtos")
        products = self.get_products()
        
        new_id = max([p["id"] for p in products] + [0]) + 1
        product_dict["id"] = new_id
        
        row_data = [
            new_id,
            product_dict["sku"],
            product_dict["name"],
            product_dict.get("category", ""),
            product_dict["purchase_cost"],
            product_dict.get("quantity_acquired", 1),
            product_dict.get("weight", 0.0),
            product_dict.get("height", 0.0),
            product_dict.get("width", 0.0),
            product_dict.get("length", 0.0),
            product_dict.get("cubic_weight", 0.0),
            product_dict.get("unit_cost", 0.0)
        ]
        ws.append_row(row_data)
        
        product_dict["created_at"] = datetime.datetime.utcnow().isoformat()
        product_dict["updated_at"] = datetime.datetime.utcnow().isoformat()
        return product_dict

    def update_product(self, product_id: int, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        ws = self._get_worksheet("produtos")
        records = ws.get_all_records()
        
        row_idx = -1
        current_product = None
        for i, r in enumerate(records):
            if safe_int(r.get("id") or 0) == product_id:
                row_idx = i + 2
                current_product = r
                break
                
        if row_idx == -1:
            return None
            
        for k, v in update_data.items():
            current_product[k] = v
            
        row_data = [
            product_id,
            current_product["sku"],
            current_product["name"],
            current_product.get("category", ""),
            safe_float(current_product["purchase_cost"]),
            safe_int(current_product.get("quantity_acquired", 1)),
            safe_float(current_product.get("weight", 0.0)),
            safe_float(current_product.get("height", 0.0)),
            safe_float(current_product.get("width", 0.0)),
            safe_float(current_product.get("length", 0.0)),
            safe_float(current_product.get("cubic_weight", 0.0)),
            safe_float(current_product.get("unit_cost", 0.0))
        ]
        
        ws.update(range_name=f"A{row_idx}:L{row_idx}", values=[row_data])
        current_product["id"] = product_id
        return current_product

    def delete_product(self, product_id: int) -> bool:
        ws = self._get_worksheet("produtos")
        records = ws.get_all_records()
        for i, r in enumerate(records):
            if safe_int(r.get("id") or 0) == product_id:
                ws.delete_rows(i + 2)
                return True
        return False

    # --- PACKAGING ---
    def get_packaging(self) -> List[Dict[str, Any]]:
        ws = self._get_worksheet("embalagens")
        records = ws.get_all_records()
        return [{
            "id": safe_int(r.get("id") or 0),
            "name": str(r.get("name")),
            "cost": safe_float(r.get("cost") or 0.0),
            "type": str(r.get("type")),
            "created_at": datetime.datetime.utcnow().isoformat()
        } for r in records]

    def create_packaging(self, pkg_dict: Dict[str, Any]) -> Dict[str, Any]:
        ws = self._get_worksheet("embalagens")
        pkgs = self.get_packaging()
        new_id = max([p["id"] for p in pkgs] + [0]) + 1
        pkg_dict["id"] = new_id
        
        ws.append_row([new_id, pkg_dict["name"], pkg_dict["cost"], pkg_dict["type"]])
        pkg_dict["created_at"] = datetime.datetime.utcnow().isoformat()
        return pkg_dict

    def delete_packaging(self, pkg_id: int) -> bool:
        ws = self._get_worksheet("embalagens")
        records = ws.get_all_records()
        for i, r in enumerate(records):
            if safe_int(r.get("id") or 0) == pkg_id:
                ws.delete_rows(i + 2)
                return True
        return False

    # --- OPERATIONAL COSTS ---
    def get_operational_costs(self) -> List[Dict[str, Any]]:
        ws = self._get_worksheet("custos_operacionais")
        records = ws.get_all_records()
        return [{
            "id": safe_int(r.get("id") or 0),
            "name": str(r.get("name")),
            "amount": safe_float(r.get("amount") or 0.0),
            "type": str(r.get("type")),
            "created_at": datetime.datetime.utcnow().isoformat()
        } for r in records]

    def create_operational_cost(self, op_dict: Dict[str, Any]) -> Dict[str, Any]:
        ws = self._get_worksheet("custos_operacionais")
        ops = self.get_operational_costs()
        new_id = max([o["id"] for o in ops] + [0]) + 1
        op_dict["id"] = new_id
        
        ws.append_row([new_id, op_dict["name"], op_dict["amount"], op_dict["type"]])
        op_dict["created_at"] = datetime.datetime.utcnow().isoformat()
        return op_dict

    def delete_operational_cost(self, op_id: int) -> bool:
        ws = self._get_worksheet("custos_operacionais")
        records = ws.get_all_records()
        for i, r in enumerate(records):
            if safe_int(r.get("id") or 0) == op_id:
                ws.delete_rows(i + 2)
                return True
        return False

    # --- MARKETPLACE CONFIGS ---
    def get_ml_config(self) -> Dict[str, Any]:
        ws = self._get_worksheet("config_ml")
        records = ws.get_all_records()
        if not records:
            return {
                "id": 1,
                "classic_commission_rate": 11.5,
                "premium_commission_rate": 16.5,
                "fixed_fee_threshold": 79.0,
                "fixed_fee": 6.0,
                "tax_rate": 4.0,
                "shipping_subsidy_rate": 50.0,
                "is_active": True
            }
        r = records[0]
        return {
            "id": 1,
            "classic_commission_rate": safe_float(r.get("classic_commission_rate") or 11.5),
            "premium_commission_rate": safe_float(r.get("premium_commission_rate") or 16.5),
            "fixed_fee_threshold": safe_float(r.get("fixed_fee_threshold") or 79.0),
            "fixed_fee": safe_float(r.get("fixed_fee") or 6.0),
            "tax_rate": safe_float(r.get("tax_rate") or 4.0),
            "shipping_subsidy_rate": safe_float(r.get("shipping_subsidy_rate") or 50.0),
            "is_active": True
        }

    def update_ml_config(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        ws = self._get_worksheet("config_ml")
        row_values = [
            cfg["classic_commission_rate"],
            cfg["premium_commission_rate"],
            cfg["fixed_fee_threshold"],
            cfg["fixed_fee"],
            cfg["tax_rate"],
            cfg["shipping_subsidy_rate"]
        ]
        ws.update(range_name="A2:F2", values=[row_values])
        cfg["id"] = 1
        cfg["is_active"] = True
        return cfg

    def get_shopee_config(self) -> Dict[str, Any]:
        ws = self._get_worksheet("config_shopee")
        records = ws.get_all_records()
        if not records:
            return {
                "id": 1,
                "commission_rate": 14.0,
                "service_fee_rate": 6.0,
                "transaction_fee_rate": 2.0,
                "tax_rate": 4.0,
                "has_free_shipping_program": True,
                "has_cashback_program": False,
                "is_active": True
            }
        r = records[0]
        return {
            "id": 1,
            "commission_rate": safe_float(r.get("commission_rate") or 14.0),
            "service_fee_rate": safe_float(r.get("service_fee_rate") or 6.0),
            "transaction_fee_rate": safe_float(r.get("transaction_fee_rate") or 2.0),
            "tax_rate": safe_float(r.get("tax_rate") or 4.0),
            "has_free_shipping_program": str(r.get("has_free_shipping_program")).upper() == "TRUE",
            "has_cashback_program": str(r.get("has_cashback_program")).upper() == "TRUE",
            "is_active": True
        }

    def update_shopee_config(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        ws = self._get_worksheet("config_shopee")
        row_values = [
            cfg["commission_rate"],
            cfg["service_fee_rate"],
            cfg["transaction_fee_rate"],
            cfg["tax_rate"],
            "TRUE" if cfg["has_free_shipping_program"] else "FALSE",
            "TRUE" if cfg["has_cashback_program"] else "FALSE"
        ]
        ws.update(range_name="A2:F2", values=[row_values])
        cfg["id"] = 1
        cfg["is_active"] = True
        return cfg

    # --- SIMULATIONS ---
    def get_simulations(self) -> List[Dict[str, Any]]:
        ws = self._get_worksheet("simulacoes")
        records = ws.get_all_records()
        simulations = []
        for i, r in enumerate(records):
            simulations.append({
                "id": i + 1,
                "product_sku": str(r.get("product_sku") or ""),
                "product_name": str(r.get("product_name") or ""),
                "marketplace": str(r.get("marketplace") or ""),
                "mode": safe_int(r.get("mode") or 1),
                "input_value": safe_float(r.get("input_value") or 0.0),
                "calculated_price": safe_float(r.get("calculated_price") or 0.0),
                "calculated_profit": safe_float(r.get("calculated_profit") or 0.0),
                "calculated_margin": safe_float(r.get("calculated_margin") or 0.0),
                "calculated_roi": safe_float(r.get("calculated_roi") or 0.0),
                "created_at": str(r.get("created_at") or datetime.datetime.utcnow().isoformat())
            })
        return simulations

    def create_simulation(self, sim_dict: Dict[str, Any]) -> Dict[str, Any]:
        ws = self._get_worksheet("simulacoes")
        created_at = datetime.datetime.utcnow().isoformat()
        row_values = [
            sim_dict.get("product_sku") or "",
            sim_dict.get("product_name") or "",
            sim_dict["marketplace"],
            sim_dict["mode"],
            sim_dict["input_value"],
            sim_dict["calculated_price"],
            sim_dict["calculated_profit"],
            sim_dict["calculated_margin"],
            sim_dict["calculated_roi"],
            created_at
        ]
        ws.append_row(row_values)
        sim_dict["id"] = 999
        sim_dict["created_at"] = created_at
        return sim_dict

sheets_db = GoogleSheetsService()
