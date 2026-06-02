'use client';

import { useState, useEffect } from 'react';
import { 
  Package, 
  Archive, 
  TrendingUp, 
  Trash2, 
  Plus, 
  X,
  FileText,
  AlertTriangle,
  Coins
} from 'lucide-react';
import { api } from '@/lib/api';
import { Product, Packaging, OperationalCost } from '@/types';

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'packaging' | 'operational'>('products');
  
  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [packaging, setPackaging] = useState<Packaging[]>([]);
  const [operational, setOperational] = useState<OperationalCost[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [showOpModal, setShowOpModal] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState({
    sku: '', name: '', category: '', purchase_cost: 0, quantity_acquired: 1,
    weight: 0, height: 0, width: 0, length: 0
  });
  
  const [pkgForm, setPkgForm] = useState({
    name: '', cost: 0, type: 'box'
  });
  
  const [opForm, setOpForm] = useState({
    name: '', amount: 0, type: 'fixed'
  });

  // Calculate cubic weight reactively
  const currentCubicWeight = (productForm.height * productForm.width * productForm.length) / 6000;

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, pkgRes, opRes] = await Promise.all([
        api.getProducts(),
        api.getPackaging(),
        api.getOperational()
      ]);
      setProducts(prodRes);
      setPackaging(pkgRes);
      setOperational(opRes);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar os dados. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // --- Deletion actions ---
  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    try {
      await api.deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePkg = async (id: number) => {
    if (!confirm('Deseja realmente excluir este item de embalagem?')) return;
    try {
      await api.deletePackaging(id);
      setPackaging(packaging.filter(p => p.id !== id));
      // Reload products to update unit costs since packaging changed
      const prodRes = await api.getProducts();
      setProducts(prodRes);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteOp = async (id: number) => {
    if (!confirm('Deseja realmente excluir este custo operacional?')) return;
    try {
      await api.deleteOperational(id);
      setOperational(operational.filter(o => o.id !== id));
      // Reload products to update unit costs
      const prodRes = await api.getProducts();
      setProducts(prodRes);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- Creation actions ---
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createProduct(productForm);
      setProducts([res, ...products]);
      setShowProductModal(false);
      setProductForm({
        sku: '', name: '', category: '', purchase_cost: 0, quantity_acquired: 1,
        weight: 0, height: 0, width: 0, length: 0
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreatePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createPackaging(pkgForm);
      setPackaging([...packaging, res]);
      setShowPkgModal(false);
      setPkgForm({ name: '', cost: 0, type: 'box' });
      // Reload products since loaded costs update
      const prodRes = await api.getProducts();
      setProducts(prodRes);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateOp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createOperational(opForm);
      setOperational([...operational, res]);
      setShowOpModal(false);
      setOpForm({ name: '', amount: 0, type: 'fixed' });
      // Reload products since loaded costs update
      const prodRes = await api.getProducts();
      setProducts(prodRes);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Cadastro e Custos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Gerencie produtos, embalagens e despesas operacionais integradas
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl max-w-lg border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'products'
              ? 'bg-white dark:bg-slate-800 text-emerald-500 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produtos</span>
        </button>
        <button
          onClick={() => setActiveTab('packaging')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'packaging'
              ? 'bg-white dark:bg-slate-800 text-emerald-500 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Embalagens</span>
        </button>
        <button
          onClick={() => setActiveTab('operational')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'operational'
              ? 'bg-white dark:bg-slate-800 text-emerald-500 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Despesas</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 flex items-center space-x-2 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
          <span>Carregando cadastros...</span>
        </div>
      ) : (
        <>
          {/* Tab 1: Products */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold dark:text-white">Estoque de Produtos</h2>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Produto</span>
                </button>
              </div>

              {products.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl">
                  <Package className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhum produto cadastrado até o momento.</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 font-semibold">
                        <th className="px-6 py-4">SKU</th>
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">Categoria</th>
                        <th className="px-6 py-4">Custo Compra</th>
                        <th className="px-6 py-4">Custo Carregado</th>
                        <th className="px-6 py-4">Medidas (CxLxA)</th>
                        <th className="px-6 py-4">Peso Cúbico</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/10 transition">
                          <td className="px-6 py-4 font-mono font-bold text-slate-600 dark:text-slate-400">{p.sku}</td>
                          <td className="px-6 py-4 font-medium dark:text-white">{p.name}</td>
                          <td className="px-6 py-4 text-slate-500">{p.category || '—'}</td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">R$ {p.purchase_cost.toFixed(2)}</td>
                          <td className="px-6 py-4 font-semibold text-emerald-500">R$ {p.unit_cost.toFixed(2)}</td>
                          <td className="px-6 py-4 text-slate-500">
                            {p.length}x{p.width}x{p.height} cm
                          </td>
                          <td className="px-6 py-4 text-slate-500">{p.cubic_weight.toFixed(3)} kg</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition"
                              title="Excluir produto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Packaging */}
          {activeTab === 'packaging' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold dark:text-white">Insumos de Embalagem</h2>
                <button
                  onClick={() => setShowPkgModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Embalagem</span>
                </button>
              </div>

              {packaging.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl">
                  <Archive className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhum insumo de embalagem cadastrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {packaging.map((pkg) => (
                    <div 
                      key={pkg.id} 
                      className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="px-2.5 py-1 rounded-md text-[10px] uppercase font-black bg-emerald-500/10 text-emerald-400 tracking-wider">
                            {pkg.type}
                          </span>
                          <button
                            onClick={() => handleDeletePkg(pkg.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h4 className="font-bold text-lg dark:text-white">{pkg.name}</h4>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center">
                        <span className="text-xs text-slate-400">Custo unitário</span>
                        <span className="text-xl font-extrabold text-emerald-500">R$ {pkg.cost.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Operational Costs */}
          {activeTab === 'operational' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold dark:text-white">Despesas da Operação</h2>
                <button
                  onClick={() => setShowOpModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Custo</span>
                </button>
              </div>

              {operational.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl">
                  <Coins className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhum custo operacional cadastrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {operational.map((op) => (
                    <div 
                      key={op.id} 
                      className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wider ${
                            op.type === 'fixed' 
                              ? 'bg-blue-500/10 text-blue-400' 
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {op.type === 'fixed' ? 'Fixo (Mensal)' : 'Variável (Unit.)'}
                          </span>
                          <button
                            onClick={() => handleDeleteOp(op.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h4 className="font-bold text-lg dark:text-white">{op.name}</h4>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center">
                        <span className="text-xs text-slate-400">Custo</span>
                        <span className="text-xl font-extrabold text-slate-900 dark:text-white">R$ {op.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* --- Product Registration Modal --- */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-900 flex justify-between items-center">
              <h3 className="text-lg font-bold dark:text-white">Cadastrar Novo Produto</h3>
              <button 
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProduct} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">SKU / Código</label>
                  <input
                    type="text" required placeholder="Ex: SKU-XYZ-123"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Nome do Produto</label>
                  <input
                    type="text" required placeholder="Ex: Fone Bluetooth Pro"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Categoria</label>
                  <input
                    type="text" placeholder="Ex: Eletrônicos"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Custo Compra (R$)</label>
                    <input
                      type="number" step="0.01" min="0" required
                      value={productForm.purchase_cost || ''}
                      onChange={(e) => setProductForm({ ...productForm, purchase_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Qtd. Adquirida</label>
                    <input
                      type="number" min="1" required
                      value={productForm.quantity_acquired || ''}
                      onChange={(e) => setProductForm({ ...productForm, quantity_acquired: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-900 pt-6 space-y-4">
                <h4 className="text-sm font-bold dark:text-white uppercase tracking-wider">Dimensões & Logística</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Peso (kg)</label>
                    <input
                      type="number" step="0.001" min="0" required
                      value={productForm.weight || ''}
                      onChange={(e) => setProductForm({ ...productForm, weight: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Comprimento (cm)</label>
                    <input
                      type="number" step="0.1" min="0" required
                      value={productForm.length || ''}
                      onChange={(e) => setProductForm({ ...productForm, length: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Largura (cm)</label>
                    <input
                      type="number" step="0.1" min="0" required
                      value={productForm.width || ''}
                      onChange={(e) => setProductForm({ ...productForm, width: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Altura (cm)</label>
                    <input
                      type="number" step="0.1" min="0" required
                      value={productForm.height || ''}
                      onChange={(e) => setProductForm({ ...productForm, height: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                
                {/* Cubic Weight result */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-semibold">Peso Cúbico calculado:</span>
                  <span className="font-bold text-emerald-500">{currentCubicWeight.toFixed(3)} kg</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-900 pt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Packaging Add Modal --- */}
      {showPkgModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-900 flex justify-between items-center">
              <h3 className="text-lg font-bold dark:text-white">Nova Embalagem / Insumo</h3>
              <button onClick={() => setShowPkgModal(false)} className="text-slate-400 hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePkg} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Nome do Insumo</label>
                <input
                  type="text" required placeholder="Ex: Caixa P 16x11x6"
                  value={pkgForm.name}
                  onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Custo Unitário (R$)</label>
                <input
                  type="number" step="0.01" min="0" required
                  value={pkgForm.cost || ''}
                  onChange={(e) => setPkgForm({ ...pkgForm, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Tipo</label>
                <select
                  value={pkgForm.type}
                  onChange={(e) => setPkgForm({ ...pkgForm, type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="box">Caixa</option>
                  <option value="envelope">Envelope</option>
                  <option value="label">Etiqueta</option>
                  <option value="tape">Fita Adesiva</option>
                  <option value="bubble_wrap">Plástico Bolha</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button" onClick={() => setShowPkgModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Operational Cost Add Modal --- */}
      {showOpModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-900 flex justify-between items-center">
              <h3 className="text-lg font-bold dark:text-white">Nova Despesa Operacional</h3>
              <button onClick={() => setShowOpModal(false)} className="text-slate-400 hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOp} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Nome da Despesa</label>
                <input
                  type="text" required placeholder="Ex: ERP Bling"
                  value={opForm.name}
                  onChange={(e) => setOpForm({ ...opForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Valor (R$)</label>
                <input
                  type="number" step="0.01" min="0" required
                  value={opForm.amount || ''}
                  onChange={(e) => setOpForm({ ...opForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Recorrência / Tipo</label>
                <select
                  value={opForm.type}
                  onChange={(e) => setOpForm({ ...opForm, type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="fixed">Fixo Mensal (Funcionário, ERP, Energia...)</option>
                  <option value="variable">Variável Unitário (Marketing, Afiliados...)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button" onClick={() => setShowOpModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
