'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  HelpCircle,
  TrendingUp,
  Percent,
  Coins,
  ShieldCheck,
  Zap,
  Info,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { Product, ComparatorResponse } from '@/types';

export default function ComparePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [referencePrice, setReferencePrice] = useState<number>(0);
  const [shippingOverride, setShippingOverride] = useState<string>('');

  const [compareData, setCompareData] = useState<ComparatorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await api.getProducts();
      setProducts(res);
      if (res.length > 0) {
        setSelectedProductId(res[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run comparator
  const handleCompare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedProductId) return;

    setLoading(true);
    setError(null);
    try {
      const overrideVal = shippingOverride !== '' ? parseFloat(shippingOverride) : undefined;
      const res = await api.compare({
        product_id: parseInt(selectedProductId),
        reference_price: referencePrice > 0 ? referencePrice : undefined,
        shipping_override: overrideVal
      });
      setCompareData(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao realizar comparação de canais.');
      setCompareData(null);
    } finally {
      setLoading(false);
    }
  };

  // Re-run comparison when product updates to keep view reactive
  useEffect(() => {
    if (selectedProductId) {
      // Reset custom reference price to let backend decide standard 1.5x cost, or manually fill if needed
      setReferencePrice(0);
      handleCompare();
    }
  }, [selectedProductId]);

  const selectedProduct = products.find(p => p.id.toString() === selectedProductId);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Comparador de Canais
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Compare custos e rentabilidade lado a lado entre canais de venda
        </p>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-center max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-bold dark:text-white mb-2">Nenhum Produto Cadastrado</h3>
          <p className="text-slate-400 text-sm mb-4">Adicione produtos antes de comparar rentabilidades.</p>
          <a href="/products" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition">
            Ir para Cadastros
          </a>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Settings Bar */}
          <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <form onSubmit={handleCompare} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Selecionar Produto</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Preço de Referência (Opcional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">R$</span>
                  <input
                    type="number" step="0.01" min="0"
                    placeholder={selectedProduct ? `Padrão: R$ ${(selectedProduct.unit_cost * 1.5).toFixed(2)}` : '0.00'}
                    value={referencePrice || ''}
                    onChange={(e) => setReferencePrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Sobrescrever Frete (Opcional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">R$</span>
                  <input
                    type="number" step="0.01" min="0"
                    placeholder="Padrão do canal"
                    value={shippingOverride}
                    onChange={(e) => setShippingOverride(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-md shadow-emerald-500/10 transition flex items-center justify-center space-x-2"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>{loading ? 'Comparando...' : 'Comparar Canais'}</span>
              </button>
            </form>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 flex items-center space-x-2 text-sm max-w-xl mx-auto">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Comparisons Output */}
          {compareData && (
            <div className="space-y-6">
              {/* Alert Ribbon displaying winner */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-sm shadow-sm max-w-3xl mx-auto">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Canal Mais Lucrativo</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-base">
                      {compareData.best_marketplace}
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] uppercase font-black tracking-wider rounded-md animate-pulse">
                  Recomendado
                </span>
              </div>

              {/* Side-by-side Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {compareData.comparisons.map((item, idx) => {
                  const isBest = item.marketplace_name === compareData.best_marketplace;
                  return (
                    <div 
                      key={idx}
                      className={`rounded-3xl bg-slate-950 border transition-all duration-300 overflow-hidden relative ${
                        isBest 
                          ? 'border-emerald-500 shadow-xl shadow-emerald-500/5 ring-1 ring-emerald-500/20 scale-[1.02]' 
                          : 'border-slate-850 opacity-90'
                      }`}
                    >
                      {isBest && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center space-x-1">
                          <Zap className="w-3 h-3 fill-white" />
                          <span>Mais Rentável</span>
                        </div>
                      )}

                      {/* Card Header */}
                      <div className="p-6 border-b border-slate-900 bg-slate-950 space-y-3">
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Marketplace</span>
                        <h4 className="font-black text-xl text-white">{item.marketplace_name}</h4>
                        
                        <div className="pt-2">
                          <span className="text-[10px] text-slate-500 block uppercase">Lucro Líquido Estimado</span>
                          <span className="text-3xl font-black text-emerald-400">
                            R$ {item.profit.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Card Breakdown Metrics */}
                      <div className="p-6 space-y-4 text-sm text-slate-300">
                        <div className="flex justify-between items-center py-2 border-b border-slate-900">
                          <span className="text-slate-400">Preço de Venda</span>
                          <span className="font-semibold text-slate-100">R$ {item.price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-900">
                          <span className="text-slate-400">Comissões do Canal</span>
                          <span className="font-semibold text-red-400">- R$ {item.fees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-900">
                          <span className="text-slate-400">Frete Vendedor</span>
                          <span className="font-semibold text-red-400">- R$ {item.shipping.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-900">
                          <span className="text-slate-400">Imposto Estimado</span>
                          <span className="font-semibold text-red-400">- R$ {item.tax.toFixed(2)}</span>
                        </div>

                        {/* Ratios block */}
                        <div className="pt-4 grid grid-cols-2 gap-3 text-center">
                          <div className="p-3 bg-slate-900/60 border border-slate-900 rounded-xl">
                            <span className="text-[10px] text-slate-500 block uppercase">Margem</span>
                            <span className="font-bold text-slate-200 text-sm">{item.margin.toFixed(1)}%</span>
                          </div>
                          <div className="p-3 bg-slate-900/60 border border-slate-900 rounded-xl">
                            <span className="text-[10px] text-slate-500 block uppercase">ROI</span>
                            <span className="font-bold text-slate-200 text-sm">{item.roi.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table side by side representation */}
              <div className="mt-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hidden sm:block">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 font-semibold">
                      <th className="px-6 py-4">Item Comparativo</th>
                      {compareData.comparisons.map((item, idx) => (
                        <th key={idx} className="px-6 py-4">{item.marketplace_name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    <tr className="hover:bg-slate-50/20">
                      <td className="px-6 py-4 font-medium text-slate-500">Preço de Referência</td>
                      {compareData.comparisons.map((item, idx) => (
                        <td key={idx} className="px-6 py-4 font-mono">R$ {item.price.toFixed(2)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="px-6 py-4 font-medium text-slate-500">Taxas e Comissões</td>
                      {compareData.comparisons.map((item, idx) => (
                        <td key={idx} className="px-6 py-4 text-red-500 font-mono">- R$ {item.fees.toFixed(2)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="px-6 py-4 font-medium text-slate-500">Custos de Frete</td>
                      {compareData.comparisons.map((item, idx) => (
                        <td key={idx} className="px-6 py-4 text-red-500 font-mono">- R$ {item.shipping.toFixed(2)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="px-6 py-4 font-medium text-slate-500">Imposto s/ Faturamento</td>
                      {compareData.comparisons.map((item, idx) => (
                        <td key={idx} className="px-6 py-4 text-red-500 font-mono">- R$ {item.tax.toFixed(2)}</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-50/20 bg-emerald-500/5">
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-emerald-400">Lucro Líquido Final</td>
                      {compareData.comparisons.map((item, idx) => {
                        const isBest = item.marketplace_name === compareData.best_marketplace;
                        return (
                          <td key={idx} className={`px-6 py-4 font-black font-mono ${isBest ? 'text-emerald-500 text-base' : 'text-slate-700 dark:text-slate-300'}`}>
                            R$ {item.profit.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="px-6 py-4 font-semibold text-slate-500">Margem Líquida</td>
                      {compareData.comparisons.map((item, idx) => (
                        <td key={idx} className="px-6 py-4 font-bold">{item.margin.toFixed(1)}%</td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-50/20">
                      <td className="px-6 py-4 font-semibold text-slate-500">ROI Operacional</td>
                      {compareData.comparisons.map((item, idx) => (
                        <td key={idx} className="px-6 py-4 font-bold">{item.roi.toFixed(1)}%</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
