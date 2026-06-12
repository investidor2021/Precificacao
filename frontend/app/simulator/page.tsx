'use client';

import { useState, useEffect } from 'react';
import { 
  Calculator, 
  ShoppingBag, 
  HelpCircle,
  TrendingUp,
  Percent,
  DollarSign,
  Info,
  Layers,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { Product, SimulatorResult, Packaging } from '@/types';

export default function SimulatorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [selectedItemKey, setSelectedItemKey] = useState<string>('');
  const [marketplace, setMarketplace] = useState<string>('mercado_livre_classic');
  const [mode, setMode] = useState<number>(1); // 1 = Price, 2 = Margin, 3 = Profit
  const [inputValue, setInputValue] = useState<string>('');
  const [shippingOverride, setShippingOverride] = useState<string>('');
  const [freeShipping, setFreeShipping] = useState(false);
  const [reputation, setReputation] = useState<string>('verde');
  const [category, setCategory] = useState<string>('');
  const [packagingOverrideId, setPackagingOverrideId] = useState<number | null>(null);
  
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedSections, setExpandedSections] = useState({
    cost: true,
    fees: true,
    shipping: true,
  });

  const toggleSection = (section: 'cost' | 'fees' | 'shipping') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  const parseFormFloat = (val: string | number) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(val.replace(',', '.')) || 0;
  };

  // Run calculation
  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedItemKey) return;

    setLoading(true);
    setError(null);
    try {
      const isKit = selectedItemKey.startsWith('kit_');
      const itemId = parseInt(selectedItemKey.split('_')[1]);
      const overrideVal = shippingOverride !== '' ? parseFormFloat(shippingOverride) : undefined;
      const res = await api.simulate({
        product_id: itemId,
        marketplace,
        mode,
        input_value: parseFormFloat(inputValue),
        reputation,
        shipping_override: overrideVal,
        is_kit: isKit,
        free_shipping: freeShipping,
        category: category || undefined,
        packaging_override_id: packagingOverrideId
      });
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao realizar cálculo de precificação.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Trigger calculation when selectors change to make it feel alive!
  useEffect(() => {
    if (selectedItemKey && parseFormFloat(inputValue) > 0) {
      handleCalculate();
    }
  }, [selectedItemKey, marketplace, mode, freeShipping, reputation, category, packagingOverrideId]);

  const selectedItem = selectedItemKey.startsWith('kit_')
    ? kits.find(k => `kit_${k.id}` === selectedItemKey)
    : products.find(p => `product_${p.id}` === selectedItemKey);

  const containers = packagings.filter(p => p.type === 'box' || p.type === 'envelope');

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Simulador de Precificação
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Simule preços ideais baseado em margens, custos e taxas dos marketplaces
        </p>
      </div>

      {products.length === 0 && kits.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-center max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-bold dark:text-white mb-2">Nenhum Produto ou Kit Cadastrado</h3>
          <p className="text-slate-400 text-sm mb-4">Cadastre produtos ou kits no estoque antes de realizar simulações.</p>
          <a href="/products" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition">
            Ir para Cadastros
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Inputs Panel */}
          <div className="lg:col-span-2 space-y-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg dark:text-white flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <span>Configurar Simulação</span>
            </h3>

            <form onSubmit={handleCalculate} className="space-y-6">
              {/* Product selector */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Produto / Kit Alvo</label>
                <select
                  value={selectedItemKey}
                  onChange={(e) => { setSelectedItemKey(e.target.value); setPackagingOverrideId(null); }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
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
                </select>
                {selectedItem && (
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>Custo Carregado: R$ {selectedItem.unit_cost.toFixed(2)}</span>
                    <span>Peso: {selectedItem.weight} kg</span>
                  </div>
                )}
              </div>

              {/* Marketplace Selector */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Canal de Venda</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'mercado_livre_classic', label: 'ML Clássico' },
                    { key: 'mercado_livre_premium', label: 'ML Premium' },
                    { key: 'shopee', label: 'Shopee' }
                  ].map((mp) => (
                    <button
                      key={mp.key} type="button"
                      onClick={() => setMarketplace(mp.key)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition ${
                        marketplace === mp.key
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                          : 'border-slate-200 dark:border-slate-850 hover:bg-slate-900 text-slate-400'
                      }`}
                    >
                      {mp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reputation Selector (Mercado Livre only) */}
              {marketplace.startsWith('mercado_livre') && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Reputação do Vendedor (Tabela 2026)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'verde', label: 'Verde / Líder' },
                      { key: 'amarela', label: 'Amarela' },
                      { key: 'vermelha', label: 'Vermelha' }
                    ].map((rep) => (
                      <button
                        key={rep.key} type="button"
                        onClick={() => setReputation(rep.key)}
                        className={`py-2 rounded-lg text-xs font-semibold border transition ${
                          reputation === rep.key
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                            : 'border-slate-200 dark:border-slate-850 hover:bg-slate-900 text-slate-400'
                        }`}
                      >
                        {rep.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Selector */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Departamento / Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

              {/* Solve Mode Selector */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Modo de Cálculo</label>
                <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                  {[
                    { modeNum: 1, label: 'Modo 1: Preço', desc: 'Preço Final' },
                    { modeNum: 2, label: 'Modo 2: Margem', desc: 'Margem %' },
                    { modeNum: 3, modeLabel: 'Modo 3: Lucro', label: 'Modo 3: Lucro', desc: 'Lucro R$' }
                  ].map((m) => (
                    <button
                      key={m.modeNum} type="button"
                      onClick={() => { setMode(m.modeNum); setInputValue(''); }}
                      className={`flex-1 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition ${
                        mode === m.modeNum
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m.label.split(':')[1].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Value based on mode */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">
                  {mode === 1 && 'Preço de Venda Informado (R$)'}
                  {mode === 2 && 'Margem de Lucro Desejada (%)'}
                  {mode === 3 && 'Lucro Líquido Desejado (R$)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">
                    {mode === 2 ? '%' : 'R$'}
                  </span>
                  <input
                    type="text" required
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Free Shipping Volunteer Toggle */}
              {marketplace.startsWith('mercado_livre') && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-900">
                  <label className="flex items-start space-x-3 text-sm text-slate-700 dark:text-slate-350 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={freeShipping}
                      onChange={(e) => setFreeShipping(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 w-4 h-4 mt-0.5"
                    />
                    <div>
                      <span className="block text-slate-900 dark:text-slate-200">Oferecer Frete Grátis Voluntário</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-450 block font-normal mt-0.5">
                        Aplica frete grátis subsidiado mesmo para preços abaixo de R$ 79,00
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Advanced Shipping Override */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-900">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-bold uppercase flex items-center space-x-1.5">
                    <span>Sobrescrever Frete (Opcional)</span>
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">R$</span>
                  <input
                    type="text"
                    placeholder="Padrão calculado"
                    value={shippingOverride}
                    onChange={(e) => setShippingOverride(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/10 transition flex items-center justify-center space-x-2"
              >
                {loading ? 'Calculando...' : 'Calcular Precificação'}
              </button>
            </form>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-3 space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 flex items-center space-x-2 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!result && !error && (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-500 min-h-[400px]">
                <Info className="w-12 h-12 text-slate-600 mb-3" />
                <p className="font-semibold text-slate-400">Pronto para calcular</p>
                <p className="text-xs text-slate-500 mt-1">Insira os dados à esquerda e clique em calcular.</p>
              </div>
            )}

            {result && (
              <div className="bg-slate-950 border border-slate-850 rounded-2xl shadow-xl overflow-hidden text-slate-100">
                {/* Header Summary */}
                <div className="p-6 bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border-b border-slate-900 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preço de Venda Sugerido</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] uppercase font-black tracking-wider text-emerald-400">
                      {marketplace.replace('_', ' ').replace('classic', 'clássico')}
                    </span>
                  </div>
                  
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-4xl font-black text-white">R$ {result.price.toFixed(2)}</h2>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Lucro Líquido</span>
                      <span className="text-xl font-bold text-emerald-400">R$ {result.net_profit.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Profitability Badges */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-900/80 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Margem Líquida</span>
                      <span className="font-bold text-emerald-400">{result.margin.toFixed(1)}%</span>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-900/80 flex items-center justify-between">
                      <span className="text-xs text-slate-400">ROI</span>
                      <span className="font-bold text-emerald-400">{result.roi.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Breakdown Details */}
                <div className="p-6 space-y-4">
                  <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Demonstrativo Detalhado</h4>

                  <div className="divide-y divide-slate-900">
                    {/* Custo Total de Compra */}
                    <div className="py-3">
                      <button 
                        type="button"
                        onClick={() => toggleSection('cost')}
                        className="w-full flex justify-between items-center text-sm hover:text-white transition focus:outline-none"
                      >
                        <span className="text-slate-400 flex items-center space-x-1">
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${expandedSections.cost ? 'rotate-90' : ''}`} />
                          <span>Custo Total de Compra (Insumos + Despesas)</span>
                        </span>
                        <span className="font-medium text-slate-200">R$ {result.unit_cost.toFixed(2)}</span>
                      </button>
                      
                      {expandedSections.cost && (
                        <div className="pl-5 pr-2 py-2 mt-2 space-y-2 text-xs text-slate-450 border-l border-slate-800 transition-all duration-200">
                          <div className="flex justify-between">
                            <span>Custo de Compra do Item</span>
                            <span>R$ {result.purchase_cost.toFixed(2)}</span>
                          </div>
                          <div className="py-2 border-t border-b border-slate-900 my-1 space-y-2">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-450">Embalagem Recomendada/Selecionada:</span>
                              <span className="font-semibold text-slate-200">{result.selected_packaging_name || 'Nenhuma'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-450">Alterar Embalagem:</span>
                              <select
                                value={packagingOverrideId || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPackagingOverrideId(val ? parseInt(val) : null);
                                }}
                                className="px-2 py-0.5 bg-slate-900 border border-slate-850 rounded text-slate-300 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              >
                                <option value="">Auto (Recomendada)</option>
                                {containers.map(c => (
                                  <option key={c.id} value={c.id}>{c.name} (R$ {c.cost.toFixed(2)})</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex justify-between text-[11px] pt-1">
                              <span className="text-slate-450">Custo Total de Embalagens</span>
                              <span>R$ {result.packaging_cost.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span>Custo Fixo Alocado (Meta 1000 un)</span>
                            <span>R$ {result.fixed_operational_cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Custo Variável Operacional</span>
                            <span>R$ {result.variable_operational_cost.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Comissões & Tarifas */}
                    <div className="py-3">
                      <button 
                        type="button"
                        onClick={() => toggleSection('fees')}
                        className="w-full flex justify-between items-center text-sm hover:text-white transition focus:outline-none"
                      >
                        <span className="text-slate-400 flex items-center space-x-1">
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${expandedSections.fees ? 'rotate-90' : ''}`} />
                          <span>Comissões & Tarifas do Canal</span>
                        </span>
                        <span className="font-medium text-red-450">- R$ {result.marketplace_fees.toFixed(2)}</span>
                      </button>

                      {expandedSections.fees && (
                        <div className="pl-5 pr-2 py-2 mt-2 space-y-2 text-xs text-slate-450 border-l border-slate-800 transition-all duration-200">
                          <div className="flex justify-between">
                            <span>Comissão Percentual</span>
                            <span>R$ {result.commission_percent_val.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tarifa Fixa por Venda</span>
                            <span>R$ {result.fixed_fee_val.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Frete pago pelo Vendedor */}
                    <div className="py-3">
                      <button 
                        type="button"
                        onClick={() => toggleSection('shipping')}
                        className="w-full flex justify-between items-center text-sm hover:text-white transition focus:outline-none"
                      >
                        <span className="text-slate-400 flex items-center space-x-1">
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${expandedSections.shipping ? 'rotate-90' : ''}`} />
                          <span>Frete pago pelo Vendedor</span>
                        </span>
                        <span className="font-medium text-red-450">- R$ {result.shipping_cost.toFixed(2)}</span>
                      </button>

                      {expandedSections.shipping && (
                        <div className="pl-5 pr-2 py-2 mt-2 space-y-2 text-xs text-slate-450 border-l border-slate-800 transition-all duration-200">
                          <div className="flex justify-between">
                            <span>Frete Bruto de Tabela</span>
                            <span>R$ {result.raw_shipping_val.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-500">
                            <span>Subsídio do Canal (Reputação {reputation.charAt(0).toUpperCase() + reputation.slice(1)})</span>
                            <span>- R$ {result.shipping_discount_val.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Impostos */}
                    <div className="py-3 flex justify-between text-sm items-center">
                      <span className="text-slate-400 pl-5">
                        {result.tax_rate !== undefined 
                          ? `Simples Nacional (${result.tax_rate.toFixed(1)}%)` 
                          : 'Impostos incidentes'}
                      </span>
                      <span className="font-medium text-red-450">- R$ {result.tax_cost.toFixed(2)}</span>
                    </div>

                    {/* Markup */}
                    <div className="py-3 flex justify-between text-sm border-t border-slate-900 font-bold">
                      <span className="text-slate-200">Markup Final</span>
                      <span className="text-emerald-400">{result.markup.toFixed(2)}x</span>
                    </div>
                  </div>

                  {/* Breakeven Banner */}
                  <div className="mt-6 p-4 bg-slate-900/80 rounded-xl border border-slate-900 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Info className="w-5 h-5 text-indigo-400" />
                      <div>
                        <span className="text-xs text-slate-400 block font-semibold">Ponto de Equilíbrio (Preço Mínimo)</span>
                        <span className="text-xs text-slate-500">Cobre apenas despesas (Lucro R$ 0)</span>
                      </div>
                    </div>
                    <span className="font-black text-slate-200 text-lg">
                      R$ {result.breakeven_price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
