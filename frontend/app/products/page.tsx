'use client';

import { useState, useEffect } from 'react';
import { 
  Package, 
  Archive, 
  TrendingUp, 
  Trash2, 
  Pencil,
  Plus, 
  X,
  FileText,
  AlertTriangle,
  Coins,
  RefreshCw,
  Layers
} from 'lucide-react';
import { api } from '@/lib/api';
import { Product, Packaging, OperationalCost } from '@/types';

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'kits' | 'packaging' | 'operational'>('products');
  
  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [packaging, setPackaging] = useState<Packaging[]>([]);
  const [operational, setOperational] = useState<OperationalCost[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showKitModal, setShowKitModal] = useState(false);
  const [kitSearchQuery, setKitSearchQuery] = useState('');
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [showOpModal, setShowOpModal] = useState(false);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingPkgId, setEditingPkgId] = useState<number | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({
    sku: '', name: '', category: '', purchase_cost: '', quantity_acquired: '1',
    weight: '', height: '', width: '', length: ''
  });

  // Custom states for pricing input modes (Unit vs Pack/Kit)
  const [pricingMode, setPricingMode] = useState<'unit' | 'pack'>('unit');
  const [packTotalCost, setPackTotalCost] = useState<string>('');
  const [packQuantity, setPackQuantity] = useState<string>('10');

  const [kitForm, setKitForm] = useState({
    sku: '', name: '', category: '', weight: '', height: '', width: '', length: '',
    items: [] as { product_id: number; quantity: number }[]
  });
  
  const [pkgForm, setPkgForm] = useState({
    name: '', cost: '', type: 'box'
  });
  
  const [opForm, setOpForm] = useState({
    name: '', amount: '', type: 'fixed'
  });

  const parseFormFloat = (val: string | number) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(val.replace(',', '.')) || 0;
  };

  const parseFormInt = (val: string | number) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseInt(val) || 0;
  };

  // Calculate cubic weight reactively
  const currentCubicWeight = (parseFormFloat(productForm.height) * parseFormFloat(productForm.width) * parseFormFloat(productForm.length)) / 6000;

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, pkgRes, opRes, kitRes] = await Promise.all([
        api.getProducts(),
        api.getPackaging(),
        api.getOperational(),
        api.getKits()
      ]);
      setProducts(prodRes);
      setPackaging(pkgRes);
      setOperational(opRes);
      setKits(kitRes);
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

  const handleDeleteKit = async (id: number) => {
    if (!confirm('Deseja realmente excluir este kit?')) return;
    try {
      await api.deleteKit(id);
      setKits(kits.filter(k => k.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePkg = async (id: number) => {
    if (!confirm('Deseja realmente excluir este item de embalagem?')) return;
    try {
      await api.deletePackaging(id);
      setPackaging(packaging.filter(p => p.id !== id));
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
      const prodRes = await api.getProducts();
      setProducts(prodRes);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- Form resetting ---
  const resetProductForm = () => {
    setProductForm({
      sku: '', name: '', category: '', purchase_cost: '', quantity_acquired: '1',
      weight: '', height: '', width: '', length: ''
    });
    setPricingMode('unit');
    setPackTotalCost('');
    setPackQuantity('10');
    setIsEditing(false);
    setEditingProductId(null);
  };

  const handleCloseProductModal = () => {
    setShowProductModal(false);
    resetProductForm();
  };

  // --- Edit triggering ---
  const handleEditProductClick = (product: Product) => {
    setProductForm({
      sku: product.sku,
      name: product.name,
      category: product.category || '',
      purchase_cost: product.purchase_cost.toString(),
      quantity_acquired: product.quantity_acquired.toString(),
      weight: product.weight.toString(),
      height: product.height.toString(),
      width: product.width.toString(),
      length: product.length.toString()
    });
    setPricingMode('unit');
    setPackTotalCost('');
    setPackQuantity('10');
    setEditingProductId(product.id);
    setIsEditing(true);
    setShowProductModal(true);
  };

  // --- Creation / Update actions ---
  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalPurchaseCost = parseFormFloat(productForm.purchase_cost);
      let finalQuantity = parseFormInt(productForm.quantity_acquired) || 1;

      if (pricingMode === 'pack') {
        const totalCost = parseFormFloat(packTotalCost);
        const qtyInPack = parseFormInt(packQuantity) || 1;
        finalPurchaseCost = totalCost / qtyInPack;
        finalQuantity = qtyInPack;
      }

      const payload = {
        sku: productForm.sku,
        name: productForm.name,
        category: productForm.category,
        purchase_cost: finalPurchaseCost,
        quantity_acquired: finalQuantity,
        weight: parseFormFloat(productForm.weight),
        height: parseFormFloat(productForm.height),
        width: parseFormFloat(productForm.width),
        length: parseFormFloat(productForm.length)
      };

      if (isEditing && editingProductId !== null) {
        const res = await api.updateProduct(editingProductId, payload);
        setProducts(products.map(p => p.id === editingProductId ? res : p));
      } else {
        const res = await api.createProduct(payload);
        setProducts([res, ...products]);
      }
      setShowProductModal(false);
      resetProductForm();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetKitForm = () => {
    setKitForm({
      sku: '', name: '', category: '', weight: '', height: '', width: '', length: '',
      items: []
    });
    setKitSearchQuery('');
  };

  const handleAddKitItem = () => {
    if (products.length === 0) return;
    setKitForm({
      ...kitForm,
      items: [...kitForm.items, { product_id: products[0].id, quantity: 1 }]
    });
  };

  const handleRemoveKitItem = (index: number) => {
    setKitForm({
      ...kitForm,
      items: kitForm.items.filter((_, i) => i !== index)
    });
  };

  const handleKitItemChange = (index: number, field: 'product_id' | 'quantity', value: any) => {
    const updated = [...kitForm.items];
    updated[index] = { ...updated[index], [field]: value };
    setKitForm({ ...kitForm, items: updated });
  };

  const currentKitCost = kitForm.items.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.product_id);
    return sum + (prod ? prod.purchase_cost * item.quantity : 0);
  }, 0);

  const handleKitFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kitForm.items.length === 0) {
      alert('Adicione pelo menos um produto ao kit.');
      return;
    }
    try {
      const payload = {
        sku: kitForm.sku,
        name: kitForm.name,
        category: kitForm.category,
        weight: parseFormFloat(kitForm.weight),
        height: parseFormFloat(kitForm.height),
        width: parseFormFloat(kitForm.width),
        length: parseFormFloat(kitForm.length),
        items: kitForm.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      };
      const res = await api.createKit(payload);
      setKits([res, ...kits]);
      setShowKitModal(false);
      resetKitForm();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAutoCalculateKitLogistics = () => {
    if (kitForm.items.length === 0) {
      alert('Adicione pelo menos um produto ao kit para calcular as dimensões.');
      return;
    }
    
    let totalWeight = 0;
    let maxHeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    
    kitForm.items.forEach(item => {
      const prod = products.find(p => p.id === item.product_id);
      if (prod) {
        totalWeight += prod.weight * item.quantity;
        // Stack height vertically
        maxHeight += prod.height * item.quantity;
        // Bounding box flat dimensions
        maxLength = Math.max(maxLength, prod.length);
        maxWidth = Math.max(maxWidth, prod.width);
      }
    });
    
    setKitForm({
      ...kitForm,
      weight: totalWeight.toFixed(3).replace('.', ','),
      height: maxHeight.toFixed(1).replace('.', ','),
      width: maxWidth.toFixed(1).replace('.', ','),
      length: maxLength.toFixed(1).replace('.', ',')
    });
  };

  const handleCreatePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: pkgForm.name,
        cost: parseFormFloat(pkgForm.cost),
        type: pkgForm.type
      };
      if (editingPkgId !== null) {
        const res = await api.updatePackaging(editingPkgId, payload);
        setPackaging(packaging.map(p => p.id === editingPkgId ? res : p));
      } else {
        const res = await api.createPackaging(payload);
        setPackaging([...packaging, res]);
      }
      setShowPkgModal(false);
      setPkgForm({ name: '', cost: '', type: 'box' });
      setEditingPkgId(null);
      const prodRes = await api.getProducts();
      setProducts(prodRes);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditPkgClick = (pkg: Packaging) => {
    setPkgForm({
      name: pkg.name,
      cost: pkg.cost.toString().replace('.', ','),
      type: pkg.type
    });
    setEditingPkgId(pkg.id);
    setShowPkgModal(true);
  };

  const handleCreateOp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: opForm.name,
        amount: parseFormFloat(opForm.amount),
        type: opForm.type
      };
      const res = await api.createOperational(payload);
      setOperational([...operational, res]);
      setShowOpModal(false);
      setOpForm({ name: '', amount: '', type: 'fixed' });
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
      <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl max-w-xl border border-slate-200 dark:border-slate-800">
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
          onClick={() => setActiveTab('kits')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'kits'
              ? 'bg-white dark:bg-slate-800 text-emerald-500 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Kits</span>
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
                  onClick={() => { resetProductForm(); setShowProductModal(true); }}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Produto</span>
                </button>
              </div>

              {/* Cards de Resumo de Estoque */}
              {products.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-800/80 shadow-xs">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total de SKUs</span>
                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{products.length}</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-800/80 shadow-xs">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total de Unidades</span>
                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                      {products.reduce((acc, p) => acc + p.quantity_acquired, 0)} un
                    </p>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-800/80 shadow-xs">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Custo Total de Compra</span>
                    <p className="text-2xl font-black text-emerald-500 mt-1">
                      R$ {products.reduce((acc, p) => acc + (p.purchase_cost * p.quantity_acquired), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

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
                        <th className="px-6 py-4">Qtd. Adquirida</th>
                        <th className="px-6 py-4">Custo Unitário</th>
                        <th className="px-6 py-4">Custo Total</th>
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
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-bold">{p.quantity_acquired}</td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">R$ {p.purchase_cost.toFixed(2)}</td>
                          <td className="px-6 py-4 font-bold text-emerald-500">R$ {(p.purchase_cost * p.quantity_acquired).toFixed(2)}</td>
                          <td className="px-6 py-4 text-slate-500">
                            {p.length}x{p.width}x{p.height} cm
                          </td>
                          <td className="px-6 py-4 text-slate-500">{p.cubic_weight.toFixed(3)} kg</td>
                          <td className="px-6 py-4 text-right flex justify-end space-x-2">
                            <button
                              onClick={() => handleEditProductClick(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition"
                              title="Editar produto"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
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
                    <tfoot className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-sm font-semibold">
                      <tr className="text-slate-700 dark:text-slate-200 font-bold">
                        <td className="px-6 py-4">Total</td>
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4 text-slate-800 dark:text-slate-100">
                          {products.reduce((acc, p) => acc + p.quantity_acquired, 0)} un
                        </td>
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4 text-emerald-500 font-black">
                          R$ {products.reduce((acc, p) => acc + (p.purchase_cost * p.quantity_acquired), 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 1.5: Kits */}
          {activeTab === 'kits' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold dark:text-white">Kits de Produtos</h2>
                <button
                  onClick={() => { resetKitForm(); setShowKitModal(true); }}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Kit</span>
                </button>
              </div>

              {kits.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl">
                  <Layers className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhum kit cadastrado até o momento.</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 font-semibold">
                        <th className="px-6 py-4">SKU</th>
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">Categoria</th>
                        <th className="px-6 py-4">Itens Integrantes</th>
                        <th className="px-6 py-4">Custo Compra</th>
                        <th className="px-6 py-4">Custo Carregado</th>
                        <th className="px-6 py-4">Medidas (CxLxA)</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {kits.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/10 transition">
                          <td className="px-6 py-4 font-mono font-bold text-slate-600 dark:text-slate-400">{k.sku}</td>
                          <td className="px-6 py-4 font-medium dark:text-white">{k.name}</td>
                          <td className="px-6 py-4 text-slate-500">{k.category || '—'}</td>
                          <td className="px-6 py-4 text-slate-500">
                            <div className="flex flex-col space-y-1">
                              {k.items?.map((item: any, idx: number) => (
                                <span key={idx} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-350">
                                  {item.quantity}x {item.product_sku || 'Item'} ({item.product_name})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">R$ {k.purchase_cost.toFixed(2)}</td>
                          <td className="px-6 py-4 font-semibold text-emerald-500">R$ {k.unit_cost.toFixed(2)}</td>
                          <td className="px-6 py-4 text-slate-500">
                            {k.length}x{k.width}x{k.height} cm ({k.weight} kg)
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end space-x-2">
                            <button
                              onClick={() => handleDeleteKit(k.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition"
                              title="Excluir kit"
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
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleEditPkgClick(pkg)}
                              className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePkg(pkg.id)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* --- Product Registration/Editing Modal --- */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-900 flex justify-between items-center">
              <h3 className="text-lg font-bold dark:text-white">
                {isEditing ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button 
                onClick={handleCloseProductModal}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleProductFormSubmit} className="p-6 overflow-y-auto space-y-6">
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
                {/* Cost Input Mode Selection */}
                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase">Modo de Custo de Compra</label>
                  <div className="flex space-x-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg w-full">
                    <button
                      type="button"
                      onClick={() => setPricingMode('unit')}
                      className={`flex-1 py-2 rounded-md text-xs font-bold transition ${
                        pricingMode === 'unit'
                          ? 'bg-white dark:bg-slate-850 text-emerald-500 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Preço Unitário
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingMode('pack')}
                      className={`flex-1 py-2 rounded-md text-xs font-bold transition ${
                        pricingMode === 'pack'
                          ? 'bg-white dark:bg-slate-850 text-emerald-500 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Preço do Lote / Kit
                    </button>
                  </div>
                </div>

                {pricingMode === 'unit' ? (
                  <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">Custo Compra Unitário (R$)</label>
                      <input
                        type="text" required placeholder="Ex: 10,50"
                        value={productForm.purchase_cost}
                        onChange={(e) => setProductForm({ ...productForm, purchase_cost: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">Qtd. Adquirida</label>
                      <input
                        type="text" required placeholder="Ex: 1"
                        value={productForm.quantity_acquired}
                        onChange={(e) => setProductForm({ ...productForm, quantity_acquired: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">Preço Total do Lote/Kit (R$)</label>
                      <input
                        type="text" required placeholder="Ex: 100,00"
                        value={packTotalCost}
                        onChange={(e) => setPackTotalCost(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-bold uppercase">Qtd. Unidades no Lote/Kit</label>
                      <input
                        type="text" required placeholder="Ex: 10"
                        value={packQuantity}
                        onChange={(e) => setPackQuantity(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="col-span-2 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-center justify-between text-xs mt-1">
                      <span className="text-slate-400 font-semibold">Preço Unitário calculado para o cadastro:</span>
                      <span className="font-bold text-emerald-500">
                        R$ {((parseFormFloat(packTotalCost) / (parseFormInt(packQuantity) || 1)) || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-900 pt-6 space-y-4">
                <h4 className="text-sm font-bold dark:text-white uppercase tracking-wider">Dimensões & Logística</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Peso (kg)</label>
                    <input
                      type="text" required placeholder="Ex: 0,20"
                      value={productForm.weight}
                      onChange={(e) => setProductForm({ ...productForm, weight: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Comprimento (cm)</label>
                    <input
                      type="text" required placeholder="Ex: 14,2"
                      value={productForm.length}
                      onChange={(e) => setProductForm({ ...productForm, length: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Largura (cm)</label>
                    <input
                      type="text" required placeholder="Ex: 11,8"
                      value={productForm.width}
                      onChange={(e) => setProductForm({ ...productForm, width: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Altura (cm)</label>
                    <input
                      type="text" required placeholder="Ex: 2,3"
                      value={productForm.height}
                      onChange={(e) => setProductForm({ ...productForm, height: e.target.value })}
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
                  onClick={handleCloseProductModal}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  {isEditing ? 'Atualizar Produto' : 'Salvar Produto'}
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
              <h3 className="text-lg font-bold dark:text-white">
                {editingPkgId !== null ? 'Editar Embalagem / Insumo' : 'Nova Embalagem / Insumo'}
              </h3>
              <button 
                onClick={() => { setShowPkgModal(false); setEditingPkgId(null); setPkgForm({ name: '', cost: '', type: 'box' }); }} 
                className="text-slate-400 hover:text-slate-200 p-1"
              >
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
                  type="text" required placeholder="Ex: 1,50"
                  value={pkgForm.cost}
                  onChange={(e) => setPkgForm({ ...pkgForm, cost: e.target.value })}
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
                  type="button" 
                  onClick={() => { setShowPkgModal(false); setEditingPkgId(null); setPkgForm({ name: '', cost: '', type: 'box' }); }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  {editingPkgId !== null ? 'Atualizar' : 'Salvar'}
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
                  type="text" required placeholder="Ex: 150,00"
                  value={opForm.amount}
                  onChange={(e) => setOpForm({ ...opForm, amount: e.target.value })}
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
      {/* --- Kit Registration Modal --- */}
      {showKitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-900 flex justify-between items-center">
              <h3 className="text-lg font-bold dark:text-white">Cadastrar Novo Kit</h3>
              <button 
                onClick={() => setShowKitModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleKitFormSubmit} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">SKU / Código do Kit</label>
                  <input
                    type="text" required placeholder="Ex: KIT-REFLETORES-3X"
                    value={kitForm.sku}
                    onChange={(e) => setKitForm({ ...kitForm, sku: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Nome do Kit</label>
                  <input
                    type="text" required placeholder="Ex: Kit 3x Refletor Led ECO 200W"
                    value={kitForm.name}
                    onChange={(e) => setKitForm({ ...kitForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Categoria</label>
                  <input
                    type="text" placeholder="Ex: Kits Eletrônicos"
                    value={kitForm.category}
                    onChange={(e) => setKitForm({ ...kitForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Products list for Kit */}
              <div className="border-t border-slate-200 dark:border-slate-900 pt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="text-sm font-bold dark:text-white uppercase tracking-wider">Produtos Selecionados para o Kit</h4>
                  
                  {/* Search box inside modal */}
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Buscar por nome ou SKU..."
                      value={kitSearchQuery}
                      onChange={(e) => setKitSearchQuery(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {products.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl text-slate-500 text-xs">
                    Nenhum produto unitário cadastrado no estoque para montar o kit.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 border border-slate-200 dark:border-slate-850 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/20">
                    {products
                      .filter(p => 
                        p.name.toLowerCase().includes(kitSearchQuery.toLowerCase()) || 
                        p.sku.toLowerCase().includes(kitSearchQuery.toLowerCase())
                      )
                      .map((p) => {
                        const kitItem = kitForm.items.find(item => item.product_id === p.id);
                        const qty = kitItem ? kitItem.quantity : 0;
                        
                        return (
                          <div 
                            key={p.id} 
                            className={`flex items-center justify-between p-3 rounded-xl border transition ${
                              qty > 0 
                                ? 'border-emerald-500/80 bg-emerald-500/5' 
                                : 'border-slate-200 dark:border-slate-850/80 hover:border-slate-350 dark:hover:border-slate-750'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-mono font-bold text-slate-500">{p.sku}</span>
                                <span className="text-xs bg-slate-100/80 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
                                  Unit: R$ {p.purchase_cost.toFixed(2)}
                                </span>
                              </div>
                              <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate mt-0.5">{p.name}</h5>
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (qty === 0) return;
                                  if (qty === 1) {
                                    setKitForm({
                                      ...kitForm,
                                      items: kitForm.items.filter(item => item.product_id !== p.id)
                                    });
                                  } else {
                                    setKitForm({
                                      ...kitForm,
                                      items: kitForm.items.map(item => 
                                        item.product_id === p.id ? { ...item, quantity: qty - 1 } : item
                                      )
                                    });
                                  }
                                }}
                                className="w-7 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-855 flex items-center justify-center text-slate-500 font-bold transition select-none text-sm"
                              >
                                -
                              </button>
                              
                              <input
                                type="number"
                                min="0"
                                value={qty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  if (val <= 0) {
                                    setKitForm({
                                      ...kitForm,
                                      items: kitForm.items.filter(item => item.product_id !== p.id)
                                    });
                                  } else {
                                    const exists = kitForm.items.some(item => item.product_id === p.id);
                                    if (exists) {
                                      setKitForm({
                                        ...kitForm,
                                        items: kitForm.items.map(item => 
                                          item.product_id === p.id ? { ...item, quantity: val } : item
                                        )
                                      });
                                    } else {
                                      setKitForm({
                                        ...kitForm,
                                        items: [...kitForm.items, { product_id: p.id, quantity: val }]
                                      });
                                    }
                                  }
                                }}
                                className="w-10 text-center bg-transparent border-0 focus:ring-0 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              
                              <button
                                type="button"
                                onClick={() => {
                                  const exists = kitForm.items.some(item => item.product_id === p.id);
                                  if (exists) {
                                    setKitForm({
                                      ...kitForm,
                                      items: kitForm.items.map(item => 
                                        item.product_id === p.id ? { ...item, quantity: qty + 1 } : item
                                      )
                                    });
                                  } else {
                                    setKitForm({
                                      ...kitForm,
                                      items: [...kitForm.items, { product_id: p.id, quantity: 1 }]
                                    });
                                  }
                                }}
                                className="w-7 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-855 flex items-center justify-center text-slate-500 font-bold transition select-none text-sm"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Kit Purchase Cost preview */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between text-sm">
                  <span className="text-slate-400 font-semibold">Custo de Compra Consolidado:</span>
                  <span className="font-bold text-emerald-500">R$ {currentKitCost.toFixed(2)}</span>
                </div>
              </div>

              {/* Kit Logistics */}
              <div className="border-t border-slate-200 dark:border-slate-900 pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold dark:text-white uppercase tracking-wider">Logística e Embalagem do Kit</h4>
                  <button
                    type="button"
                    onClick={handleAutoCalculateKitLogistics}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-lg text-xs font-bold transition"
                  >
                    <span>⚡ Autocalcular Logística</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Peso (kg)</label>
                    <input
                      type="text" required placeholder="Ex: 0,60"
                      value={kitForm.weight}
                      onChange={(e) => setKitForm({ ...kitForm, weight: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Comprimento (cm)</label>
                    <input
                      type="text" required placeholder="Ex: 20,0"
                      value={kitForm.length}
                      onChange={(e) => setKitForm({ ...kitForm, length: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Largura (cm)</label>
                    <input
                      type="text" required placeholder="Ex: 15,0"
                      value={kitForm.width}
                      onChange={(e) => setKitForm({ ...kitForm, width: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">Altura (cm)</label>
                    <input
                      type="text" required placeholder="Ex: 10,0"
                      value={kitForm.height}
                      onChange={(e) => setKitForm({ ...kitForm, height: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-900 pt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowKitModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  Salvar Kit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
