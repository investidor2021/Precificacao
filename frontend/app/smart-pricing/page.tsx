'use client';

import { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  HelpCircle,
  Plus,
  X,
  TrendingUp,
  Percent,
  Coins,
  TrendingDown,
  Activity,
  AlertCircle,
  Play
} from 'lucide-react';
import { api } from '@/lib/api';
import { Product, SmartPricingResponse, SmartPricingTier } from '@/types';

export default function SmartPricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [packagings, setPackagings] = useState<any[]>([]);
  
  // Selection Mode
  const [isManualCost, setIsManualCost] = useState(false);
  const [selectedItemKey, setSelectedItemKey] = useState<string>('');
  const [customCost, setCustomCost] = useState<string>('');
  const [category, setCategory] = useState<string>('eletronico');
  const [packagingOverrideId, setPackagingOverrideId] = useState<number | null>(null);
  const [minDesiredMargin, setMinDesiredMargin] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'classic' | 'premium' | 'shopee'>('classic');
  
  // Competitors tags list
  const [competitorInput, setCompetitorInput] = useState<string>('');
  const [competitors, setCompetitors] = useState<number[]>([]);
  
  const [pricingData, setPricingData] = useState<SmartPricingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProductsAndKits();
  }, []);

  const loadProductsAndKits = async () => {
    try {
      const [prodRes, kitRes, pkgRes] = await Promise.all([
        api.getProducts(),
        api.getKits(),
        api.getPackaging()
      ]);
      setProducts(prodRes);
      setKits(kitRes);
      setPackagings(pkgRes);
      if (prodRes.length > 0) {
        setSelectedItemKey(`product_${prodRes[0].id}`);
      } else if (kitRes.length > 0) {
        setSelectedItemKey(`kit_${kitRes[0].id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setPackagingOverrideId(null);
  }, [selectedItemKey, isManualCost]);

  const addCompetitorPrice = () => {
    const val = parseFloat(competitorInput.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      setCompetitors([...competitors, val]);
      setCompetitorInput('');
    }
  };

  const removeCompetitorPrice = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const parseFormFloat = (val: string | number) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(val.replace(',', '.')) || 0;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const isKit = selectedItemKey.startsWith('kit_');
      const itemId = parseInt(selectedItemKey.split('_')[1]);
      
      const payload = {
        product_id: isManualCost ? undefined : itemId,
        custom_cost: isManualCost ? parseFormFloat(customCost) : undefined,
        category,
        competitors,
        is_kit: isManualCost ? undefined : isKit,
        packaging_override_id: packagingOverrideId,
        min_desired_margin: minDesiredMargin !== '' ? parseFormFloat(minDesiredMargin) : undefined
      };
      
      const res = await api.smartPricing(payload);
      setPricingData(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao calcular preços inteligentes.');
      setPricingData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-3">
          <BrainCircuit className="w-8 h-8 text-emerald-400" />
          <span>Preço Inteligente</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Algoritmo avançado que sugere preços defensivos, de combate e ideais baseados na concorrência
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-lg dark:text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Mapeamento de Mercado</span>
          </h3>

          <form onSubmit={handleGenerate} className="space-y-6">
            {/* Cost Input Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-bold uppercase">Custo Unitário</label>
                <label className="flex items-center space-x-2 text-xs text-emerald-400 font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isManualCost}
                    onChange={(e) => setIsManualCost(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span>Digitar custo manualmente</span>
                </label>
              </div>

              {!isManualCost ? (
                <select
                  value={selectedItemKey}
                  onChange={(e) => setSelectedItemKey(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                >
                  {products.length === 0 && kits.length === 0 ? (
                    <option value="">Nenhum produto ou kit cadastrado</option>
                  ) : (
                    <>
                      <optgroup label="Produtos">
                        {products.map(p => (
                          <option key={`product_${p.id}`} value={`product_${p.id}`}>{p.sku} — {p.name}</option>
                        ))}
                      </optgroup>
                      {kits.length > 0 && (
                        <optgroup label="Kits">
                          {kits.map(k => (
                            <option key={`kit_${k.id}`} value={`kit_${k.id}`}>{k.sku} — {k.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">R$</span>
                  <input
                    type="text" required
                    value={customCost}
                    onChange={(e) => setCustomCost(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                    placeholder="0,00"
                  />
                </div>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-bold uppercase">Departamento / Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
              >
                <option value="">Padrão (Planilha)</option>
                <option value="veiculo">Acessórios para Veículos</option>
                <option value="agro">Agro, Alimentos e Bebidas</option>
                <option value="brinquedo">Brinquedos, Bebês e Hobbies</option>
                <option value="sapato">Calçados, Roupas e Bolsas (Moda)</option>
                <option value="casa">Casa, Móveis, Decoração e Ferramentas</option>
                <option value="eletronico">Celulares, Computadores e Tecnologia</option>
                <option value="esporte">Esportes e Fitness</option>
                <option value="livro">Livros, Revistas, Filmes e Música</option>
                <option value="beleza">Beleza, Cuidado Pessoal, Saúde e Joias</option>
              </select>
            </div>

            {/* Packaging Override */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-bold uppercase">Embalagem</label>
              <select
                value={packagingOverrideId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setPackagingOverrideId(val ? parseInt(val) : null);
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
              >
                <option value="">Auto (Recomendada)</option>
                {packagings
                  .filter(p => p.type === 'box' || p.type === 'envelope')
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name} (R$ {c.cost.toFixed(2)})</option>
                  ))}
              </select>
            </div>

            {/* Safety Margin */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-bold uppercase">Margem de Segurança Mínima (%)</label>
              <div className="relative">
                <input
                  type="text"
                  value={minDesiredMargin}
                  onChange={(e) => setMinDesiredMargin(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 pr-8"
                  placeholder="Sem limite mínimo (ex: 15)"
                />
                <span className="absolute right-3 top-2.5 text-slate-500 text-sm font-semibold">%</span>
              </div>
            </div>

            {/* Competitor Price Tags */}
            <div className="space-y-3">
              <label className="text-xs text-slate-400 font-bold uppercase">Preço dos Concorrentes</label>
              
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">R$</span>
                  <input
                    type="text"
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCompetitorPrice();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                    placeholder="0,00"
                  />
                </div>
                <button
                  type="button"
                  onClick={addCompetitorPrice}
                  className="px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition flex items-center justify-center"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Tags Box */}
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-850 min-h-[64px]">
                {competitors.length === 0 ? (
                  <span className="text-xs text-slate-500 m-auto">Nenhum concorrente adicionado.</span>
                ) : (
                  competitors.map((price, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-750"
                    >
                      <span>R$ {price.toFixed(2)}</span>
                      <button 
                        type="button" 
                        onClick={() => removeCompetitorPrice(idx)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/10 transition flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>{loading ? 'Calculando estratégias...' : 'Processar Inteligência'}</span>
            </button>
          </form>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-3 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 flex items-center space-x-2 text-sm max-w-xl mx-auto">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!pricingData && !error && (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-500 min-h-[400px]">
              <BrainCircuit className="w-12 h-12 text-slate-600 mb-3" />
              <p className="font-semibold text-slate-400">Pronto para processar dados</p>
              <p className="text-xs text-slate-500 mt-1">
                Configure os custos e preços da concorrência à esquerda para visualizar as estratégias sugeridas.
              </p>
            </div>
          )}

          {pricingData && (() => {
            const currentTiers = activeTab === 'classic'
              ? pricingData.mercado_livre_classic
              : activeTab === 'premium'
              ? pricingData.mercado_livre_premium
              : pricingData.shopee;

            return (
              <div className="space-y-6">
                {/* Tab Selector */}
                <div className="flex border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1.5 rounded-2xl shadow-sm w-full">
                  <button
                    type="button"
                    onClick={() => setActiveTab('classic')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'classic'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    ML Clássico
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('premium')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'premium'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    ML Premium
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('shopee')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                      activeTab === 'shopee'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    Shopee
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {currentTiers.map((tier, idx) => {
                    const isIdeal = tier.strategy === 'Ideal';
                    const isAggr = tier.strategy === 'Agressivo';
                    
                    return (
                      <div 
                        key={idx}
                        className={`p-6 bg-slate-950 border rounded-3xl transition-all duration-300 relative ${
                          isIdeal 
                            ? 'border-emerald-500 shadow-xl shadow-emerald-500/5 ring-1 ring-emerald-500/20' 
                            : isAggr
                            ? 'border-orange-500/60 shadow-md'
                            : 'border-slate-850 opacity-90'
                        }`}
                      >
                        {/* Strategy Label */}
                        <div className="absolute top-6 right-6 flex items-center space-x-2">
                          <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-black tracking-wider ${
                            isIdeal 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isAggr
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            Estratégia {tier.strategy}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {/* Pricing Result */}
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Preço Recomendado</span>
                            <h3 className="text-3xl font-black text-white">R$ {tier.price.toFixed(2)}</h3>
                          </div>

                          {/* Performance Indicators */}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="p-3 bg-slate-900/60 border border-slate-900 rounded-xl text-center">
                              <span className="text-[10px] text-slate-500 block uppercase">Lucro Esperado</span>
                              <span className="font-bold text-emerald-400 text-sm">R$ {tier.profit.toFixed(2)}</span>
                            </div>
                            <div className="p-3 bg-slate-900/60 border border-slate-900 rounded-xl text-center">
                              <span className="text-[10px] text-slate-500 block uppercase">Margem</span>
                              <span className="font-bold text-slate-200 text-sm">{tier.margin.toFixed(1)}%</span>
                            </div>
                            <div className="p-3 bg-slate-900/60 border border-slate-900 rounded-xl text-center">
                              <span className="text-[10px] text-slate-500 block uppercase">ROI</span>
                              <span className="font-bold text-slate-200 text-sm">{tier.roi.toFixed(1)}%</span>
                            </div>
                          </div>

                          {/* Safety Warning */}
                          {tier.safety_triggered && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center space-x-2 text-xs font-bold">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span>Margem de segurança de {minDesiredMargin}% aplicada. O preço foi ajustado para cima.</span>
                            </div>
                          )}

                          {/* Description */}
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            {tier.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
