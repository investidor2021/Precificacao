'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  DollarSign, 
  Percent, 
  TrendingUp, 
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { api } from '@/lib/api';
import { DashboardResponse } from '@/types';

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar dados do dashboard. Verifique se o backend está ativo.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-slate-900/10">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-slate-400 font-medium">Carregando métricas e gráficos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-20">
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-semibold text-red-400">Falha na Comunicação</h3>
          <p className="text-slate-400 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-sm font-medium transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const hasProducts = data && data.total_products > 0;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Painel Geral
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Resumo financeiro e análise de rentabilidade nos marketplaces
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium border border-slate-200 dark:border-slate-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Atualizar</span>
        </button>
      </div>

      {!hasProducts ? (
        /* Empty State Banner */
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-center max-w-3xl mx-auto space-y-6">
          <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <Package className="w-12 h-12 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold dark:text-white">Nenhum produto cadastrado</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
              Comece cadastrando seus custos e produtos para calcular margens, ROI e visualizar comparativos.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all duration-200"
          >
            <span>Cadastrar Primeiro Produto</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        /* Dashboard Content */
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Products */}
            <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Produtos</span>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{data?.total_products}</h3>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                <Package className="w-6 h-6" />
              </div>
            </div>

            {/* Average Profit */}
            <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Lucro Médio</span>
                <h3 className="text-3xl font-black text-emerald-500">R$ {data?.average_profit.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Average Margin */}
            <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Margem Média</span>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{data?.average_margin.toFixed(1)}%</h3>
              </div>
              <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400">
                <Percent className="w-6 h-6" />
              </div>
            </div>

            {/* Average ROI */}
            <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">ROI Médio</span>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{data?.average_roi.toFixed(1)}%</h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Graphs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Margins Evolution LineChart */}
            <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Evolução das Margens</h3>
                <p className="text-xs text-slate-500">Histórico de simulações recentes (%)</p>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.margin_evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorClassic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPremium" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorShopee" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Area type="monotone" name="ML Clássico" dataKey="ml_classic_margin" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorClassic)" />
                    <Area type="monotone" name="ML Premium" dataKey="ml_premium_margin" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPremium)" />
                    <Area type="monotone" name="Shopee" dataKey="shopee_margin" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorShopee)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Marketplace Comparison BarChart */}
            <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Comparativo de Canais</h3>
                <p className="text-xs text-slate-500">Rendimento médio por canal de venda</p>
              </div>
              <div className="h-80 w-full flex flex-col justify-between">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.marketplace_comparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                      <XAxis dataKey="marketplace" stroke="#64748b" fontSize={10} tickFormatter={(value) => value.replace('Mercado Livre ', 'ML ')} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Bar dataKey="average_profit" name="Lucro Médio (R$)" radius={[6, 6, 0, 0]}>
                        {data?.marketplace_comparison.map((entry, index) => {
                          const colors = ["#10b981", "#3b82f6", "#f97316"];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Micro info */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-around text-center">
                  {data?.marketplace_comparison.map((item, idx) => (
                    <div key={idx}>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[80px]">{item.marketplace.replace('Mercado Livre ', 'ML ')}</span>
                      <span className="text-xs font-bold dark:text-white">{item.average_margin.toFixed(1)}% margem</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Profit by Product BarChart */}
          <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lucro Líquido por Produto</h3>
              <p className="text-xs text-slate-500">Estimado baseado no markup base de 1.5x (R$)</p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.profit_by_product} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickFormatter={(val) => val.length > 12 ? `${val.substring(0, 10)}...` : val} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="ml_classic_profit" name="ML Clássico" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ml_premium_profit" name="ML Premium" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="shopee_profit" name="Shopee" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
