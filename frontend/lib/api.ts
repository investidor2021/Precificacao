const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.detail || errMsg;
    } catch {
      if (errText) errMsg = errText;
    }
    throw new Error(errMsg);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request<any>('/api/dashboard/'),

  // Products
  getProducts: () => request<any[]>('/api/products/'),
  getProduct: (id: number) => request<any>(`/api/products/${id}`),
  createProduct: (data: any) => request<any>('/api/products/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateProduct: (id: number, data: any) => request<any>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteProduct: (id: number) => request<void>(`/api/products/${id}`, {
    method: 'DELETE',
  }),

  // Costs (Packaging)
  getPackaging: () => request<any[]>('/api/costs/packaging'),
  createPackaging: (data: any) => request<any>('/api/costs/packaging', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deletePackaging: (id: number) => request<void>(`/api/costs/packaging/${id}`, {
    method: 'DELETE',
  }),

  // Costs (Operational)
  getOperational: () => request<any[]>('/api/costs/operational'),
  createOperational: (data: any) => request<any>('/api/costs/operational', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteOperational: (id: number) => request<void>(`/api/costs/operational/${id}`, {
    method: 'DELETE',
  }),

  // Marketplaces
  getMLConfig: () => request<any>('/api/marketplaces/mercado-livre'),
  updateMLConfig: (data: any) => request<any>('/api/marketplaces/mercado-livre', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getShopeeConfig: () => request<any>('/api/marketplaces/shopee'),
  updateShopeeConfig: (data: any) => request<any>('/api/marketplaces/shopee', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Simulations & Solver
  simulate: (data: {
    product_id: number;
    marketplace: string;
    mode: number;
    input_value: number;
    shipping_override?: number;
  }) => request<any>('/api/simulations/simulate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getHistory: () => request<any[]>('/api/simulations/history'),
  compare: (data: {
    product_id: number;
    reference_price?: number;
    shipping_override?: number;
  }) => request<any>('/api/simulations/compare', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  smartPricing: (data: {
    product_id?: number;
    custom_cost?: number;
    category: string;
    competitors: number[];
  }) => request<any>('/api/simulations/smart-pricing', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
