export interface Supplier {
  id: number;
  name: string;
  contact?: string;
  created_at: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category?: string;
  supplier_id?: number;
  purchase_cost: number;
  quantity_acquired: number;
  weight: number;
  height: number;
  width: number;
  length: number;
  cubic_weight: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
}

export interface Packaging {
  id: number;
  name: string;
  cost: number;
  type: string; // "box", "envelope", "label", "tape", "bubble_wrap", "other"
  created_at: string;
}

export interface OperationalCost {
  id: number;
  name: string;
  amount: number;
  type: string; // "fixed", "variable"
  created_at: string;
}

export interface MercadoLivreConfig {
  id: number;
  classic_commission_rate: number;
  premium_commission_rate: number;
  fixed_fee_threshold: number;
  fixed_fee: number;
  tax_rate: number;
  shipping_subsidy_rate: number;
  is_active: boolean;
}

export interface ShopeeConfig {
  id: number;
  commission_rate: number;
  service_fee_rate: number;
  transaction_fee_rate: number;
  tax_rate: number;
  fixed_fee: number;
  has_free_shipping_program: boolean;
  has_cashback_program: boolean;
  is_active: boolean;
}

export interface SimulationLog {
  id: number;
  product_id?: number;
  product_sku?: string;
  product_name?: string;
  marketplace: string;
  mode: number;
  input_value: number;
  calculated_price: number;
  calculated_profit: number;
  calculated_margin: number;
  calculated_roi: number;
  calculated_fees: number;
  calculated_shipping: number;
  created_at: string;
}

export interface SimulatorResult {
  price: number;
  net_profit: number;
  margin: number;
  roi: number;
  markup: number;
  breakeven_price: number;
  marketplace_fees: number;
  shipping_cost: number;
  tax_cost: number;
  unit_cost: number;
  purchase_cost: number;
  packaging_cost: number;
  fixed_operational_cost: number;
  variable_operational_cost: number;
  commission_percent_val: number;
  fixed_fee_val: number;
  raw_shipping_val: number;
  shipping_discount_val: number;
}

export interface MarketplaceComparisonDetails {
  marketplace_name: string;
  price: number;
  fees: number;
  shipping: number;
  tax: number;
  profit: number;
  margin: number;
  roi: number;
}

export interface ComparatorResponse {
  product_name: string;
  sku: string;
  unit_cost: number;
  comparisons: MarketplaceComparisonDetails[];
  best_marketplace: string;
}

export interface SmartPricingTier {
  strategy: string; // "Mínimo", "Ideal", "Agressivo"
  price: number;
  profit: number;
  margin: number;
  roi: number;
  description: string;
}

export interface SmartPricingResponse {
  tiers: SmartPricingTier[];
}

export interface ProfitByProductItem {
  name: string;
  sku: string;
  ml_classic_profit: number;
  ml_premium_profit: number;
  shopee_profit: number;
}

export interface MarketShareItem {
  marketplace: string;
  average_profit: number;
  average_margin: number;
}

export interface MarginEvolutionItem {
  date: string;
  ml_classic_margin: number;
  ml_premium_margin: number;
  shopee_margin: number;
}

export interface DashboardResponse {
  total_products: number;
  average_profit: number;
  average_margin: number;
  average_roi: number;
  profit_by_product: ProfitByProductItem[];
  marketplace_comparison: MarketShareItem[];
  margin_evolution: MarginEvolutionItem[];
}
